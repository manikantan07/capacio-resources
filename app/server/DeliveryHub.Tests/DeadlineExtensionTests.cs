using DeliveryHub.Application.Contracts;
using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Services;
using DeliveryHub.Domain;
using DeliveryHub.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Tests;

public class DeadlineExtensionTests
{
    private sealed class Clock : IDateProvider { public DateOnly Today => new(2026, 9, 21); }
    private sealed class Actor : IActorProvider { public string CurrentActorEmail => "test@applab.qa"; }

    private static (DeliveryHubDbContext Db, AssignmentsService Service, ActivityService Activity, Assignment Assignment) Build()
    {
        var db = new DeliveryHubDbContext(new DbContextOptionsBuilder<DeliveryHubDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var logger = new ActivityLogger(db, new Actor());
        var assignment = new Assignment { Id = Guid.NewGuid(), Work = "EC", Alloc = 75,
            Start = new(2026, 8, 12), End = new(2026, 9, 16) };
        db.Assignments.Add(assignment);
        db.SaveChanges();
        return (db, new(db, new Clock(), logger), new(db, logger), assignment);
    }

    [Fact]
    public async Task Extension_PersistsHistory_AndUndoRestoresOriginalDeadline()
    {
        var (db, service, activity, a) = Build();
        using var context = db;
        var updated = await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, new(2026, 9, 28), a.End, "  Review pending  "));
        Assert.Equal(new DateOnly(2026, 9, 16), updated.DeadlineExtensions.Single().PreviousDeadline);
        Assert.Equal("Review pending", updated.DeadlineExtensions.Single().Reason);
        db.ChangeTracker.Clear();
        Assert.Single((await service.GetAllAsync()).Single().DeadlineExtensions);
        var edit = await db.ActivityLogs.SingleAsync();
        Assert.True((await activity.UndoAsync([edit.Id])).Outcomes.Single().Success);
        var restored = (await service.GetAllAsync()).Single();
        Assert.Empty(restored.DeadlineExtensions);
        Assert.Equal(new DateOnly(2026, 9, 16), restored.End);
    }

    [Fact]
    public async Task Backfill_AndReasonEdit_PreserveCurrentDateAndEarlierHistory()
    {
        var (db, service, _, a) = Build();
        using var context = db;
        a.End = new(2026, 9, 28);
        await db.SaveChangesAsync();
        await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, a.End, new(2026, 9, 16)));
        var updated = await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, a.End, ExtensionReason: "Awaiting approval"));
        Assert.Equal("Awaiting approval", updated.DeadlineExtensions.Single().Reason);
        Assert.Equal(new DateOnly(2026, 9, 28), updated.End);
        await service.UpdateAllocAsync(a.Id, new(50));
        Assert.Single((await service.GetAllAsync()).Single().DeadlineExtensions);
    }

    [Fact]
    public async Task RepeatedExtensions_KeepEachDeadline()
    {
        var (db, service, _, a) = Build();
        using var context = db;
        await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, new(2026, 9, 18), a.End, "First delay"));
        var updated = await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, new(2026, 9, 28), new(2026, 9, 18), "Second delay"));
        Assert.Equal(2, updated.DeadlineExtensions.Count);
        Assert.Equal("First delay", updated.DeadlineExtensions[0].Reason);
        Assert.Equal(new DateOnly(2026, 9, 18), updated.DeadlineExtensions[1].PreviousDeadline);
    }

    [Theory]
    [InlineData("2026-09-21", "2026-09-28")]
    [InlineData("2026-08-11", "2026-09-28")]
    [InlineData("2026-09-16", "2026-09-16")]
    [InlineData("2026-09-17", "2026-09-28")]
    public async Task InvalidExtension_DoesNotMutateAssignment(string missed, string extended)
    {
        var (db, service, _, a) = Build();
        using var context = db;
        await Assert.ThrowsAsync<InvalidDeadlineExtensionException>(() => service.UpdateAsync(a.Id,
            new("Changed work", 50, a.Start, DateOnly.Parse(extended), DateOnly.Parse(missed), "Delay")));
        Assert.Empty(a.DeadlineExtensions);
        Assert.Equal("EC", a.Work);
    }

    [Fact]
    public async Task ExpiredDeadline_CannotBeSilentlyExtended()
    {
        var (db, service, _, a) = Build();
        using var context = db;
        await Assert.ThrowsAsync<InvalidDeadlineExtensionException>(() => service.UpdateAsync(a.Id,
            new(a.Work, a.Alloc, a.Start, new(2026, 9, 28))));
    }

    [Theory]
    [InlineData("DeadlineExtended", "2026-10-05")]
    [InlineData("Rescheduled", "2026-09-25")]
    [InlineData("Backlog", "2026-09-28")]
    [InlineData("OnHold", "2026-09-28")]
    [InlineData("TentativeDeadline", "2026-09-24")]
    public async Task PlannedChange_DoesNotRequireMissedDeadline(string type, string newDate)
    {
        var (db, service, _, a) = Build();
        using var context = db;
        a.End = new(2026, 9, 28);
        await db.SaveChangesAsync();
        await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, DateOnly.Parse(newDate),
            PreviousDeadline: a.End, DeadlineChangeType: type, ReasonCategory: "  Client date change  ", ExtensionReason: "Details"));
        db.ChangeTracker.Clear();
        var entry = (await service.GetAllAsync()).Single().DeadlineExtensions.Single();
        Assert.Equal(type, entry.ChangeType);
        Assert.Equal("Client date change", entry.ReasonCategory);
        Assert.Equal("Details", entry.Reason);
    }

    [Fact]
    public async Task ReclassifyingAnEntry_PreservesDatesAndDescription_AndCanBeUndone()
    {
        var (db, service, activity, a) = Build();
        using var context = db;
        await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, new(2026, 9, 28), a.End, "Original description"));
        var updated = await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, a.End,
            DeadlineChangeType: "TentativeDeadline", ReasonCategory: "Custom approval workflow"));
        var entry = updated.DeadlineExtensions.Single();
        Assert.Equal("TentativeDeadline", entry.ChangeType);
        Assert.Equal(new DateOnly(2026, 9, 16), entry.PreviousDeadline);
        Assert.Equal("Original description", entry.Reason);
        var edit = await db.ActivityLogs.OrderByDescending(log => log.OccurredAt).FirstAsync();
        Assert.True((await activity.UndoAsync([edit.Id])).Outcomes.Single().Success);
        Assert.Equal("DeadlineMissed", (await service.GetAllAsync()).Single().DeadlineExtensions.Single().ChangeType);
    }

    [Fact]
    public void OldJson_DefaultsToMissedWithoutLosingDescription()
    {
        var entry = System.Text.Json.JsonSerializer.Deserialize<DeadlineExtension>(
            """{"PreviousDeadline":"2026-09-16","NewDeadline":"2026-09-28","Reason":"Original note","RecordedAt":"2026-09-21T10:00:00Z"}""")!;
        Assert.Equal("DeadlineMissed", entry.ChangeType);
        Assert.Equal("", entry.ReasonCategory);
        Assert.Equal("Original note", entry.Reason);
    }

    [Theory]
    [InlineData("InvalidType", "Reason")]
    [InlineData("DeadlineExtended", "   ")]
    public async Task InvalidClassification_DoesNotSave(string type, string reason)
    {
        var (db, service, _, a) = Build();
        using var context = db;
        await Assert.ThrowsAsync<InvalidDeadlineExtensionException>(() => service.UpdateAsync(a.Id,
            new(a.Work, a.Alloc, a.Start, new(2026, 9, 28), PreviousDeadline: a.End, DeadlineChangeType: type, ReasonCategory: reason)));
        Assert.Empty(a.DeadlineExtensions);
    }

    [Fact]
    public async Task RepeatedChanges_KeepEarlierClassificationAndCustomReason()
    {
        var (db, service, _, a) = Build();
        using var context = db;
        await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, new(2026, 9, 28),
            PreviousDeadline: a.End, DeadlineChangeType: "TentativeDeadline", ReasonCategory: "Custom planning reason"));
        var updated = await service.UpdateAsync(a.Id, new(a.Work, a.Alloc, a.Start, new(2026, 10, 5),
            PreviousDeadline: a.End, DeadlineChangeType: "DeadlineExtended", ReasonCategory: "New client requirements"));
        Assert.Equal(2, updated.DeadlineExtensions.Count);
        Assert.Equal("TentativeDeadline", updated.DeadlineExtensions[0].ChangeType);
        Assert.Equal("Custom planning reason", updated.DeadlineExtensions[0].ReasonCategory);
        Assert.Equal("DeadlineExtended", updated.DeadlineExtensions[1].ChangeType);
    }

    [Fact]
    public async Task Complete_EndsYesterday_WithoutDeadlineHistory_AndUndoRestores()
    {
        var (db, service, activity, a) = Build();
        using var context = db;
        a.End = new(2026, 10, 30);
        await db.SaveChangesAsync();
        var done = await service.CompleteAsync(a.Id);
        Assert.Equal(new DateOnly(2026, 9, 20), done.End);
        Assert.Empty(done.DeadlineExtensions);
        await Assert.ThrowsAsync<AssignmentCompletionException>(() => service.CompleteAsync(a.Id));
        db.ChangeTracker.Clear();
        var edit = await db.ActivityLogs.SingleAsync();
        Assert.True((await activity.UndoAsync([edit.Id])).Outcomes.Single().Success);
        Assert.Equal(new DateOnly(2026, 10, 30), (await service.GetAllAsync()).Single().End);
    }

    [Fact]
    public async Task Complete_RejectsAssignmentStartingToday()
    {
        var (db, service, _, a) = Build();
        using var context = db;
        a.Start = new(2026, 9, 21);
        a.End = new(2026, 10, 30);
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<AssignmentCompletionException>(() => service.CompleteAsync(a.Id));
    }
}
