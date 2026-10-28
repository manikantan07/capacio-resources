using DeliveryHub.Application.Activity;
using DeliveryHub.Application.Contracts;
using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Rules;
using DeliveryHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Application.Services;

public class AssignmentNotFoundException(Guid id) : Exception($"Assignment '{id}' was not found.");
public class InvalidDateRangeException() : Exception("End date can't be before the start date.");
public class InvalidDeadlineExtensionException(string message) : Exception(message);
public class AssignmentCompletionException(string message) : Exception(message);

public class AssignmentsService(IDeliveryHubDbContext db, IDateProvider clock, IActivityLogger activity)
{
    public async Task<List<AssignmentDto>> GetAllAsync(CancellationToken ct = default)
    {
        var assignments = await db.Assignments.AsNoTracking().ToListAsync(ct);
        var people = await db.People.AsNoTracking().ToListAsync(ct);
        var projects = await db.Projects.AsNoTracking().ToListAsync(ct);
        var peopleById = people.ToDictionary(p => p.Id);
        var projectsById = projects.ToDictionary(p => p.Id);

        return assignments.Select(a => ToDto(a, peopleById, projectsById)).ToList();
    }

    public async Task<AssignmentDto> CreateAsync(CreateAssignmentRequest request, CancellationToken ct = default)
    {
        var alloc = Math.Clamp(request.Alloc, 5, 100);
        var assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            PersonId = request.PersonId,
            ProjectId = request.ProjectId,
            Work = request.Work,
            Alloc = alloc,
            Start = request.Start,
            End = request.End
        };

        db.Assignments.Add(assignment);
        await db.SaveChangesAsync(ct);

        var people = await db.People.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var projects = await db.Projects.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);

        var personName = people.GetValueOrDefault(assignment.PersonId)?.Name ?? "Someone";
        var projectName = projects.GetValueOrDefault(assignment.ProjectId)?.Name ?? "a project";
        await activity.LogAsync(
            ActivityActionType.AssignmentCreated, $"{personName} assigned to {projectName}",
            [ActivitySnapshot.Entry("Assignment", assignment.Id, $"{personName} — {projectName}", before: null, after: assignment)], ct);

        return ToDto(assignment, people, projects);
    }

    public async Task<AssignmentDto> UpdateAllocAsync(Guid id, UpdateAllocRequest request, CancellationToken ct = default)
    {
        var assignment = await db.Assignments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new AssignmentNotFoundException(id);
        var before = CloneAssignment(assignment);
        assignment.Alloc = Math.Clamp(request.Alloc, 5, 100);
        await db.SaveChangesAsync(ct);

        var people = await db.People.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var projects = await db.Projects.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);

        var label = $"{people.GetValueOrDefault(assignment.PersonId)?.Name} — {projects.GetValueOrDefault(assignment.ProjectId)?.Name}";
        await activity.LogAsync(
            ActivityActionType.AssignmentAllocUpdated, $"{label} allocation changed to {assignment.Alloc}%",
            [ActivitySnapshot.Entry("Assignment", assignment.Id, label, before, assignment)], ct);

        return ToDto(assignment, people, projects);
    }

    /// <summary>Full edit — work, allocation, and the date range (the stepper only covers alloc).</summary>
    public async Task<AssignmentDto> UpdateAsync(Guid id, UpdateAssignmentRequest request, CancellationToken ct = default)
    {
        var assignment = await db.Assignments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new AssignmentNotFoundException(id);
        if (request.End < request.Start)
        {
            throw new InvalidDateRangeException();
        }

        var previous = request.PreviousDeadline ?? request.MissedDeadline;
        var changeType = request.DeadlineChangeType ?? "DeadlineMissed";
        if (request.DeadlineChangeType is not null && changeType is not
            ("DeadlineMissed" or "DeadlineExtended" or "Rescheduled" or "Backlog" or "OnHold" or "TentativeDeadline"))
            throw new InvalidDeadlineExtensionException("Select a valid deadline change type.");
        if (request.PreviousDeadline is not null && request.DeadlineChangeType is null)
            throw new InvalidDeadlineExtensionException("Select a deadline change type.");
        if (request.PreviousDeadline is not null && request.MissedDeadline is not null)
            throw new InvalidDeadlineExtensionException("Provide only one previous deadline.");

        if (previous is { } previousDate)
        {
            if (previousDate < request.Start || previousDate > assignment.End)
                throw new InvalidDeadlineExtensionException("The previous deadline must be on or after the start and no later than the current end date.");
            if (assignment.DeadlineExtensions.Count > 0 && previousDate != assignment.End)
                throw new InvalidDeadlineExtensionException("The previous deadline must match the current end date for another change.");
            if (changeType == "DeadlineMissed" && (previousDate >= clock.Today || request.End <= previousDate))
                throw new InvalidDeadlineExtensionException("A missed deadline must be in the past and before the new end date.");
            if (changeType == "DeadlineExtended" && request.End <= previousDate)
                throw new InvalidDeadlineExtensionException("An extended deadline must be later than the previous deadline.");
            if (request.DeadlineChangeType is not null && string.IsNullOrWhiteSpace(request.ReasonCategory))
                throw new InvalidDeadlineExtensionException("Select or enter a reason for the deadline change.");
        }
        else if (request.End != assignment.End)
        {
            throw new InvalidDeadlineExtensionException("Record a deadline change type and reason when changing the end date.");
        }

        if (request.ExtensionReason?.Trim().Length > 2000)
            throw new InvalidDeadlineExtensionException("The description must be no longer than 2,000 characters.");
        if (request.ReasonCategory?.Trim().Length > 120)
            throw new InvalidDeadlineExtensionException("The reason must be no longer than 120 characters.");
        if (previous is null && request.DeadlineChangeType == "DeadlineMissed" && assignment.DeadlineExtensions.LastOrDefault() is { } latest
            && (latest.PreviousDeadline >= clock.Today || latest.NewDeadline <= latest.PreviousDeadline))
            throw new InvalidDeadlineExtensionException("This date change cannot be classified as a missed deadline.");
        if (previous is null && request.DeadlineChangeType == "DeadlineExtended" && assignment.DeadlineExtensions.LastOrDefault() is { } extended
            && extended.NewDeadline <= extended.PreviousDeadline)
            throw new InvalidDeadlineExtensionException("This date change cannot be classified as an extension.");
        if (previous is null && assignment.DeadlineExtensions.Count == 0 && (request.DeadlineChangeType is not null || request.ReasonCategory is not null))
            throw new InvalidDeadlineExtensionException("Provide a previous deadline to record the date change.");

        var before = CloneAssignment(assignment);
        if (previous is { } previousDeadline)
            assignment.DeadlineExtensions.Add(new(previousDeadline, request.End, request.ExtensionReason?.Trim() ?? "", DateTime.UtcNow)
            { ChangeType = changeType, ReasonCategory = request.ReasonCategory?.Trim() ?? "" });
        else if (assignment.DeadlineExtensions.Count > 0)
            assignment.DeadlineExtensions[^1] = assignment.DeadlineExtensions[^1] with
            {
                Reason = request.ExtensionReason?.Trim() ?? assignment.DeadlineExtensions[^1].Reason,
                ChangeType = request.DeadlineChangeType ?? assignment.DeadlineExtensions[^1].ChangeType,
                ReasonCategory = request.ReasonCategory?.Trim() ?? assignment.DeadlineExtensions[^1].ReasonCategory
            };
        assignment.Work = request.Work;
        assignment.Alloc = Math.Clamp(request.Alloc, 5, 100);
        assignment.Start = request.Start;
        assignment.End = request.End;
        await db.SaveChangesAsync(ct);

        var people = await db.People.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var projects = await db.Projects.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);

        var label = $"{people.GetValueOrDefault(assignment.PersonId)?.Name} — {projects.GetValueOrDefault(assignment.ProjectId)?.Name}";
        await activity.LogAsync(
            ActivityActionType.AssignmentEdited, $"{label} updated — {assignment.Start} → {assignment.End}, {assignment.Alloc}%",
            [ActivitySnapshot.Entry("Assignment", assignment.Id, label, before, assignment)], ct);

        return ToDto(assignment, people, projects);
    }

    /// <summary>
    /// Marks one person's part of a project as done: the end date becomes yesterday, so the
    /// assignment stops counting toward capacity today while its history is kept. Unlike
    /// <see cref="UpdateAsync"/>, finishing early isn't a deadline change, so nothing is
    /// added to the deadline history. Logged as an edit, so the Activity page can undo it.
    /// </summary>
    public async Task<AssignmentDto> CompleteAsync(Guid id, CancellationToken ct = default)
    {
        var assignment = await db.Assignments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new AssignmentNotFoundException(id);
        var yesterday = clock.Today.AddDays(-1);
        if (assignment.End < clock.Today)
            throw new AssignmentCompletionException("This assignment has already ended.");
        if (assignment.Start > yesterday)
            throw new AssignmentCompletionException("This assignment hasn't started before today — remove it instead.");

        var before = CloneAssignment(assignment);
        assignment.End = yesterday;
        await db.SaveChangesAsync(ct);

        var people = await db.People.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var projects = await db.Projects.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);

        var label = $"{people.GetValueOrDefault(assignment.PersonId)?.Name} — {projects.GetValueOrDefault(assignment.ProjectId)?.Name}";
        await activity.LogAsync(
            ActivityActionType.AssignmentEdited, $"{label} marked done — ended {assignment.End}",
            [ActivitySnapshot.Entry("Assignment", assignment.Id, label, before, assignment)], ct);

        return ToDto(assignment, people, projects);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var assignment = await db.Assignments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new AssignmentNotFoundException(id);

        var people = await db.People.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var projects = await db.Projects.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var personName = people.GetValueOrDefault(assignment.PersonId)?.Name ?? "Someone";
        var projectName = projects.GetValueOrDefault(assignment.ProjectId)?.Name ?? "a project";

        db.Assignments.Remove(assignment);
        await db.SaveChangesAsync(ct);

        await activity.LogAsync(
            ActivityActionType.AssignmentDeleted, $"Unassigned {personName} from {projectName}",
            [ActivitySnapshot.Entry("Assignment", assignment.Id, $"{personName} — {projectName}", before: assignment, after: null)], ct);
    }

    public async Task<AssignmentDto> ReassignAsync(Guid id, ReassignRequest request, CancellationToken ct = default)
    {
        var assignment = await db.Assignments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new AssignmentNotFoundException(id);
        var before = CloneAssignment(assignment);
        var people = await db.People.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var fromName = people.GetValueOrDefault(assignment.PersonId)?.Name ?? "Someone";

        assignment.PersonId = request.NewPersonId;
        await db.SaveChangesAsync(ct);

        var projects = await db.Projects.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var toName = people.GetValueOrDefault(assignment.PersonId)?.Name ?? "someone";
        var projectName = projects.GetValueOrDefault(assignment.ProjectId)?.Name ?? "project";

        await activity.LogAsync(
            ActivityActionType.AssignmentReassigned, $"Moved {projectName} work from {fromName} to {toName}",
            [ActivitySnapshot.Entry("Assignment", assignment.Id, $"{toName} — {projectName}", before, assignment)], ct);

        return ToDto(assignment, people, projects);
    }

    private static Assignment CloneAssignment(Assignment a) => new()
    {
        Id = a.Id, PersonId = a.PersonId, ProjectId = a.ProjectId, Work = a.Work, Alloc = a.Alloc, Start = a.Start, End = a.End,
        DeadlineExtensions = a.DeadlineExtensions.ToList()
    };

    /// <summary>For the Move popover — what each other person's load would become if this assignment moved to them.</summary>
    public async Task<List<MovePreviewDto>> GetMovePreviewAsync(Guid assignmentId, CancellationToken ct = default)
    {
        var assignment = await db.Assignments.AsNoTracking().FirstOrDefaultAsync(a => a.Id == assignmentId, ct)
            ?? throw new AssignmentNotFoundException(assignmentId);

        var people = await db.People.AsNoTracking().Where(p => p.Id != assignment.PersonId).ToListAsync(ct);
        var allAssignments = await db.Assignments.AsNoTracking().ToListAsync(ct);
        var projects = await db.Projects.AsNoTracking().ToListAsync(ct);
        var projectsById = projects.ToDictionary(p => p.Id);
        var today = clock.Today;

        return people.Select(person =>
        {
            var currentAssignments = allAssignments.Where(a => a.PersonId == person.Id).ToList();
            var currentLoad = AllocationRules.CalculateLoad(currentAssignments, pid => projectsById.GetValueOrDefault(pid), today);

            var project = projectsById.GetValueOrDefault(assignment.ProjectId);
            var movedAssignmentIsActive = project is not null && AllocationRules.IsActive(assignment, project, today);
            var projectedLoad = movedAssignmentIsActive ? currentLoad + assignment.Alloc : currentLoad;

            return new MovePreviewDto(person.Id, person.Name, currentLoad, projectedLoad, AllocationRules.GetLoadBand(projectedLoad));
        })
        .OrderBy(p => p.PersonName, StringComparer.OrdinalIgnoreCase)
        .ToList();
    }

    public async Task<SkillMatchDto> GetSkillMatchAsync(Guid personId, Guid projectId, CancellationToken ct = default)
    {
        var person = await db.People.AsNoTracking().FirstOrDefaultAsync(p => p.Id == personId, ct)
            ?? throw new PersonNotFoundException(personId);
        var project = await db.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new ProjectNotFoundException(projectId);

        var result = AllocationRules.MatchSkills(person.Skills, project.Tech);
        return new SkillMatchDto(result.Hit, result.Need, result.Missing, result.Level);
    }

    private AssignmentDto ToDto(Assignment a, IReadOnlyDictionary<Guid, Person> peopleById, IReadOnlyDictionary<Guid, Project> projectsById)
    {
        var project = projectsById.GetValueOrDefault(a.ProjectId);
        var active = project is not null && AllocationRules.IsActive(a, project, clock.Today);
        return new AssignmentDto(
            a.Id, a.PersonId, peopleById.GetValueOrDefault(a.PersonId)?.Name ?? "Former member",
            a.ProjectId, project?.Name ?? "(unknown project)", a.Work, a.Alloc, a.Start, a.End, active, a.DeadlineExtensions.ToList());
    }
}
