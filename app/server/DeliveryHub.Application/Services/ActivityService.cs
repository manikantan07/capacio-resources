using System.Text.Json;
using DeliveryHub.Application.Activity;
using DeliveryHub.Application.Contracts;
using DeliveryHub.Application.Dtos;
using DeliveryHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Application.Services;

public class ActivityService(IDeliveryHubDbContext db, IActivityLogger logger)
{
    public async Task<ActivityHistoryPage> GetHistoryAsync(DateTime? from, DateTime? to, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = db.ActivityLogs.AsNoTracking().AsQueryable();
        if (from is not null) query = query.Where(a => a.OccurredAt >= from);
        if (to is not null) query = query.Where(a => a.OccurredAt <= to);
        query = query.OrderByDescending(a => a.OccurredAt);

        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new ActivityHistoryPage(items.Select(ToDto).ToList(), total, page, pageSize);
    }

    /// <summary>
    /// Reverses exactly the given activities (like `git revert` of specific commits) —
    /// everything else in history is untouched. Processes them latest-first so that if
    /// two selected activities touched the same entity, the result lands on the state
    /// right before the earliest of the two.
    /// </summary>
    public async Task<UndoActivitiesResult> UndoAsync(List<Guid> activityIds, CancellationToken ct = default)
    {
        var outcomes = new List<UndoOutcome>();
        var activities = await db.ActivityLogs.Where(a => activityIds.Contains(a.Id)).ToListAsync(ct);

        foreach (var missingId in activityIds.Where(id => activities.All(a => a.Id != id)))
        {
            outcomes.Add(new UndoOutcome(missingId, false, "Activity not found"));
        }

        foreach (var activity in activities.OrderByDescending(a => a.OccurredAt))
        {
            if (activity.Undone)
            {
                outcomes.Add(new UndoOutcome(activity.Id, false, "Already undone"));
                continue;
            }

            try
            {
                var reverseEntries = new List<ActivityEntry>();
                foreach (var entry in activity.Entries)
                {
                    reverseEntries.Add(await UndoEntryAsync(entry, ct));
                }

                activity.Undone = true;
                activity.UndoneAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);

                await logger.LogAsync(ActivityActionType.Undo, $"Undid: {activity.Summary}", reverseEntries, ct);
                outcomes.Add(new UndoOutcome(activity.Id, true, "Undone"));
            }
            catch (Exception ex)
            {
                outcomes.Add(new UndoOutcome(activity.Id, false, ex.Message));
            }
        }

        return new UndoActivitiesResult(outcomes);
    }

    private Task<ActivityEntry> UndoEntryAsync(ActivityEntry entry, CancellationToken ct)
    {
        var id = Guid.Parse(entry.EntityId);
        return entry.EntityType switch
        {
            "Person" => UndoPersonEntryAsync(id, entry, ct),
            "Project" => UndoProjectEntryAsync(id, entry, ct),
            "Assignment" => UndoAssignmentEntryAsync(id, entry, ct),
            _ => throw new InvalidOperationException($"Unknown entity type '{entry.EntityType}'")
        };
    }

    private async Task<ActivityEntry> UndoPersonEntryAsync(Guid id, ActivityEntry entry, CancellationToken ct)
    {
        var current = await db.People.FirstOrDefaultAsync(p => p.Id == id, ct);

        if (entry.BeforeJson is null) // was a create -> undo = delete
        {
            var snapshot = current is null ? null : JsonSerializer.Serialize(current, ActivitySnapshot.Options);
            if (current is not null) db.People.Remove(current);
            return new ActivityEntry { EntityType = "Person", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = snapshot, AfterJson = null };
        }

        var before = JsonSerializer.Deserialize<Person>(entry.BeforeJson, ActivitySnapshot.Options)!;

        if (entry.AfterJson is null) // was a delete -> undo = re-insert
        {
            if (current is null) db.People.Add(before);
            return new ActivityEntry { EntityType = "Person", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = null, AfterJson = JsonSerializer.Serialize(before, ActivitySnapshot.Options) };
        }

        // was an update -> undo = restore before-values
        if (current is null) throw new InvalidOperationException($"{entry.Label} no longer exists");
        var currentSnapshot = JsonSerializer.Serialize(current, ActivitySnapshot.Options);

        current.Name = before.Name;
        current.Initials = before.Initials;
        current.Color = before.Color;
        current.Role = before.Role;
        current.Type = before.Type;
        current.Email = before.Email;
        current.Phone = before.Phone;
        current.Location = before.Location;
        current.Status = before.Status;
        current.Hours = before.Hours;
        current.Joined = before.Joined;
        current.Skills = before.Skills;
        current.Notes = before.Notes;

        return new ActivityEntry { EntityType = "Person", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = currentSnapshot, AfterJson = entry.BeforeJson };
    }

    private async Task<ActivityEntry> UndoProjectEntryAsync(Guid id, ActivityEntry entry, CancellationToken ct)
    {
        var current = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);

        if (entry.BeforeJson is null)
        {
            var snapshot = current is null ? null : JsonSerializer.Serialize(current, ActivitySnapshot.Options);
            if (current is not null) db.Projects.Remove(current);
            return new ActivityEntry { EntityType = "Project", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = snapshot, AfterJson = null };
        }

        var before = JsonSerializer.Deserialize<Project>(entry.BeforeJson, ActivitySnapshot.Options)!;

        if (entry.AfterJson is null)
        {
            if (current is null) db.Projects.Add(before);
            return new ActivityEntry { EntityType = "Project", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = null, AfterJson = JsonSerializer.Serialize(before, ActivitySnapshot.Options) };
        }

        if (current is null) throw new InvalidOperationException($"{entry.Label} no longer exists");
        var currentSnapshot = JsonSerializer.Serialize(current, ActivitySnapshot.Options);

        current.Name = before.Name;
        current.Owner = before.Owner;
        current.Description = before.Description;
        current.Tech = before.Tech;
        current.State = before.State;
        current.Color = before.Color;
        current.CompletedOn = before.CompletedOn;
        current.PlannedStart = before.PlannedStart;
        current.PlannedEnd = before.PlannedEnd;

        return new ActivityEntry { EntityType = "Project", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = currentSnapshot, AfterJson = entry.BeforeJson };
    }

    private async Task<ActivityEntry> UndoAssignmentEntryAsync(Guid id, ActivityEntry entry, CancellationToken ct)
    {
        var current = await db.Assignments.FirstOrDefaultAsync(a => a.Id == id, ct);

        if (entry.BeforeJson is null)
        {
            var snapshot = current is null ? null : JsonSerializer.Serialize(current, ActivitySnapshot.Options);
            if (current is not null) db.Assignments.Remove(current);
            return new ActivityEntry { EntityType = "Assignment", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = snapshot, AfterJson = null };
        }

        var before = JsonSerializer.Deserialize<Assignment>(entry.BeforeJson, ActivitySnapshot.Options)!;

        if (entry.AfterJson is null)
        {
            if (current is null) db.Assignments.Add(before);
            return new ActivityEntry { EntityType = "Assignment", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = null, AfterJson = JsonSerializer.Serialize(before, ActivitySnapshot.Options) };
        }

        if (current is null) throw new InvalidOperationException($"{entry.Label} no longer exists");
        var currentSnapshot = JsonSerializer.Serialize(current, ActivitySnapshot.Options);

        current.PersonId = before.PersonId;
        current.ProjectId = before.ProjectId;
        current.Work = before.Work;
        current.Alloc = before.Alloc;
        current.Start = before.Start;
        current.End = before.End;

        return new ActivityEntry { EntityType = "Assignment", EntityId = entry.EntityId, Label = entry.Label, BeforeJson = currentSnapshot, AfterJson = entry.BeforeJson };
    }

    private static ActivityLogDto ToDto(ActivityLog log) => new(
        log.Id, log.OccurredAt, log.ActorEmail, log.ActionType, log.Summary,
        log.Entries.Select(e => new ActivityEntryDto(e.EntityType, e.EntityId, e.Label, e.BeforeJson, e.AfterJson)).ToList(),
        log.Undone, log.UndoneAt, log.OriginalActivityId);
}
