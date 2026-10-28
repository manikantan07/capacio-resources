using DeliveryHub.Application.Contracts;
using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Services;
using DeliveryHub.Domain;
using DeliveryHub.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DeliveryHub.Tests;

file class FixedDateProvider(DateOnly today) : IDateProvider
{
    public DateOnly Today => today;
}

file class FixedActorProvider(string email) : IActorProvider
{
    public string CurrentActorEmail => email;
}

public class ActivityServiceTests
{
    private static readonly DateOnly Today = new(2026, 9, 1);

    private static (DeliveryHubDbContext db, PeopleService people, ProjectsService projects, AssignmentsService assignments, ActivityService activity) BuildStack()
    {
        var options = new DbContextOptionsBuilder<DeliveryHubDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new DeliveryHubDbContext(options);
        var clock = new FixedDateProvider(Today);
        var actor = new FixedActorProvider("test@applab.qa");
        var logger = new ActivityLogger(db, actor);

        return (db, new PeopleService(db, clock, logger), new ProjectsService(db, clock, logger), new AssignmentsService(db, clock, logger), new ActivityService(db, logger));
    }

    [Fact]
    public async Task EditedWork_IsReturnedAcrossAssignmentsProjectsAndPeople_AndUndoRestoresIt()
    {
        var (db, people, projects, assignments, activity) = BuildStack();
        using var context = db;
        var person = await people.CreateAsync(new CreatePersonRequest("Test Person", "React"));
        var project = await projects.CreateAsync(new CreateProjectRequest("Test Project", null, "Style support", "React", null, null, ProjectState.Active));
        var assignment = await assignments.CreateAsync(new CreateAssignmentRequest(person.Id, project.Id, "Style support", 50, Today, Today.AddDays(30)));
        const string work = "Style support, and new updates";

        await assignments.UpdateAsync(assignment.Id, new(work, 50, assignment.Start, assignment.End));
        db.ChangeTracker.Clear();
        Assert.Equal(work, (await assignments.GetAllAsync()).Single().Work);
        Assert.Equal(work, (await projects.GetLiveMatrixAsync()).Single().Cells.Single().Work);
        Assert.Equal(work, (await people.GetByIdAsync(person.Id)).Assignments.Single().Work);

        var edit = await db.ActivityLogs.SingleAsync(log => log.ActionType == ActivityActionType.AssignmentEdited);
        Assert.True((await activity.UndoAsync([edit.Id])).Outcomes.Single().Success);
        Assert.Equal("Style support", (await projects.GetLiveMatrixAsync()).Single().Cells.Single().Work);
    }

    [Fact]
    public async Task Undo_OfPersonCreate_DeletesThePerson()
    {
        var (db, people, _, _, activity) = BuildStack();

        var created = await people.CreateAsync(new CreatePersonRequest("Test Person", "React"));
        var history = await activity.GetHistoryAsync(null, null, 1, 10);
        var createActivityId = history.Items.Single(i => i.ActionType == ActivityActionType.PersonCreated).Id;

        var result = await activity.UndoAsync([createActivityId]);

        Assert.True(result.Outcomes.Single().Success);
        Assert.False(await db.People.AnyAsync(p => p.Id == created.Id));
    }

    [Fact]
    public async Task Undo_OfPersonDelete_RestoresThePerson()
    {
        var (db, people, projects, assignments, activity) = BuildStack();

        var created = await people.CreateAsync(new CreatePersonRequest("Test Person", "React"));
        await people.DeleteAsync(created.Id);
        Assert.False(await db.People.AnyAsync(p => p.Id == created.Id));

        var history = await activity.GetHistoryAsync(null, null, 1, 10);
        var deleteActivityId = history.Items.Single(i => i.ActionType == ActivityActionType.PersonDeleted).Id;

        var result = await activity.UndoAsync([deleteActivityId]);

        Assert.True(result.Outcomes.Single().Success);
        var restored = await db.People.FirstOrDefaultAsync(p => p.Id == created.Id);
        Assert.NotNull(restored);
        Assert.Equal("Test Person", restored!.Name);
    }

    [Fact]
    public async Task Undo_OfPersonUpdate_RevertsFieldsOnly()
    {
        var (db, people, _, _, activity) = BuildStack();

        var created = await people.CreateAsync(new CreatePersonRequest("Test Person", "React"));
        await people.UpdateAsync(created.Id, new UpdatePersonRequest(
            "Test Person", "Senior Engineer", PersonType.FullTime, "test@applab.qa", null, "Doha",
            PersonStatus.Active, "40", null, ["React"], null));

        var history = await activity.GetHistoryAsync(null, null, 1, 10);
        var updateActivityId = history.Items.Single(i => i.ActionType == ActivityActionType.PersonUpdated).Id;

        var result = await activity.UndoAsync([updateActivityId]);

        Assert.True(result.Outcomes.Single().Success);
        var reverted = await db.People.FirstAsync(p => p.Id == created.Id);
        Assert.Equal("Frontend Engineer", reverted.Role); // CreateAsync's default role
    }

    [Fact]
    public async Task Undo_OfMarkComplete_RestoresProjectStateAndTruncatedAssignmentEndDates()
    {
        var (db, people, projects, assignments, activity) = BuildStack();

        var person = await people.CreateAsync(new CreatePersonRequest("Test Person", "React"));
        var project = await projects.CreateAsync(new CreateProjectRequest("Test Project", null, null, "React", null, null, ProjectState.Active));
        var assignment = await assignments.CreateAsync(new CreateAssignmentRequest(
            person.Id, project.Id, "Work", 100, Today.AddDays(-5), Today.AddDays(30)));

        await projects.MarkCompleteAsync(project.Id);

        var truncated = await db.Assignments.AsNoTracking().FirstAsync(a => a.Id == assignment.Id);
        Assert.Equal(Today, truncated.End); // truncated by rule 5

        var history = await activity.GetHistoryAsync(null, null, 1, 10);
        var completeActivityId = history.Items.Single(i => i.ActionType == ActivityActionType.ProjectMarkedComplete).Id;

        var result = await activity.UndoAsync([completeActivityId]);
        Assert.True(result.Outcomes.Single().Success);

        var restoredProject = await db.Projects.AsNoTracking().FirstAsync(p => p.Id == project.Id);
        Assert.Equal(ProjectState.Active, restoredProject.State);
        Assert.Null(restoredProject.CompletedOn);

        var restoredAssignment = await db.Assignments.AsNoTracking().FirstAsync(a => a.Id == assignment.Id);
        Assert.Equal(Today.AddDays(30), restoredAssignment.End); // original end date restored
    }

    [Fact]
    public async Task Undo_OfRange_LeavesOtherActivitiesUntouched()
    {
        var (db, people, _, _, activity) = BuildStack();

        var a = await people.CreateAsync(new CreatePersonRequest("Person A", "React"));
        var b = await people.CreateAsync(new CreatePersonRequest("Person B", "React"));
        await people.UpdateAsync(a.Id, new UpdatePersonRequest(
            "Person A", "Lead", PersonType.FullTime, "a@applab.qa", null, null, PersonStatus.Active, "40", null, ["React"], null));

        var history = await activity.GetHistoryAsync(null, null, 1, 10);
        var updateActivityId = history.Items.Single(i => i.ActionType == ActivityActionType.PersonUpdated).Id;

        // Undo only the update to Person A — Person B's creation must be untouched.
        var result = await activity.UndoAsync([updateActivityId]);

        Assert.True(result.Outcomes.Single().Success);
        Assert.True(await db.People.AnyAsync(p => p.Id == b.Id));
        var revertedA = await db.People.FirstAsync(p => p.Id == a.Id);
        Assert.Equal("Frontend Engineer", revertedA.Role);
    }

    [Fact]
    public async Task Undo_TwoUpdatesToSameAssignment_ReverseChronological_LandsBeforeEarliest()
    {
        var (db, people, projects, assignments, activity) = BuildStack();

        var person = await people.CreateAsync(new CreatePersonRequest("Test Person", "React"));
        var project = await projects.CreateAsync(new CreateProjectRequest("Test Project", null, null, "React", null, null, ProjectState.Active));
        var assignment = await assignments.CreateAsync(new CreateAssignmentRequest(
            person.Id, project.Id, "Work", 25, Today.AddDays(-5), Today.AddDays(30)));

        await assignments.UpdateAllocAsync(assignment.Id, new UpdateAllocRequest(50)); // 25 -> 50
        await assignments.UpdateAllocAsync(assignment.Id, new UpdateAllocRequest(75)); // 50 -> 75

        var history = await activity.GetHistoryAsync(null, null, 1, 10);
        var allocActivityIds = history.Items
            .Where(i => i.ActionType == ActivityActionType.AssignmentAllocUpdated)
            .Select(i => i.Id)
            .ToList();
        Assert.Equal(2, allocActivityIds.Count);

        var result = await activity.UndoAsync(allocActivityIds);
        Assert.All(result.Outcomes, o => Assert.True(o.Success));

        var final = await db.Assignments.AsNoTracking().FirstAsync(a => a.Id == assignment.Id);
        Assert.Equal(25, final.Alloc); // back to the original value, before both updates
    }
}
