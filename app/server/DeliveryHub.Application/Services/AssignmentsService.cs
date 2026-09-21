using DeliveryHub.Application.Activity;
using DeliveryHub.Application.Contracts;
using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Rules;
using DeliveryHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Application.Services;

public class AssignmentNotFoundException(Guid id) : Exception($"Assignment '{id}' was not found.");
public class InvalidDateRangeException() : Exception("End date can't be before the start date.");

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

        var before = CloneAssignment(assignment);
        // Recording a missed deadline captures whatever End was set to just before this edit —
        // do this first, before it's overwritten below. Checking the box again on a later edit
        // simply replaces the record with the most recent one; it doesn't keep a full history.
        if (request.RecordMissedDeadline)
        {
            assignment.OriginalDeadline = assignment.End;
            assignment.ExtensionReason = request.Reason;
        }
        assignment.Work = request.Work;
        assignment.Alloc = Math.Clamp(request.Alloc, 5, 100);
        assignment.Start = request.Start;
        assignment.End = request.End;
        await db.SaveChangesAsync(ct);

        var people = await db.People.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);
        var projects = await db.Projects.AsNoTracking().ToDictionaryAsync(p => p.Id, ct);

        var label = $"{people.GetValueOrDefault(assignment.PersonId)?.Name} — {projects.GetValueOrDefault(assignment.ProjectId)?.Name}";
        var actionType = request.RecordMissedDeadline ? ActivityActionType.AssignmentDeadlineExtended : ActivityActionType.AssignmentEdited;
        var summary = request.RecordMissedDeadline
            ? $"{label} missed deadline recorded — extended to {assignment.End}"
            : $"{label} updated — {assignment.Start} → {assignment.End}, {assignment.Alloc}%";
        await activity.LogAsync(
            actionType, summary,
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
        OriginalDeadline = a.OriginalDeadline, ExtensionReason = a.ExtensionReason
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
        var deadlineMissed = project is not null && AllocationRules.IsDeadlineMissed(a, project, clock.Today);
        return new AssignmentDto(
            a.Id, a.PersonId, peopleById.GetValueOrDefault(a.PersonId)?.Name ?? "Former member",
            a.ProjectId, project?.Name ?? "(unknown project)", a.Work, a.Alloc, a.Start, a.End, active,
            deadlineMissed, a.OriginalDeadline, a.ExtensionReason);
    }
}
