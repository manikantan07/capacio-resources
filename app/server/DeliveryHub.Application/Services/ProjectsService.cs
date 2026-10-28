using DeliveryHub.Application.Activity;
using DeliveryHub.Application.Contracts;
using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Rules;
using DeliveryHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Application.Services;

public class ProjectNotFoundException(Guid id) : Exception($"Project '{id}' was not found.");
public class ProjectNotTentativeException(string name) : Exception($"{name} is already confirmed.");
public class DuplicateProjectNameException(string name) : Exception($"A project named '{name}' already exists.");

public class ProjectsService(IDeliveryHubDbContext db, IDateProvider clock, IActivityLogger activity)
{
    // Rule 8: completed projects are excluded from the Projects matrix / live capacity totals.
    public async Task<List<ProjectDto>> GetLiveMatrixAsync(CancellationToken ct = default)
    {
        var projects = await db.Projects.AsNoTracking()
            .Where(p => p.State != ProjectState.Completed)
            .ToListAsync(ct);
        var assignments = await db.Assignments.AsNoTracking().ToListAsync(ct);
        var people = await db.People.AsNoTracking().ToListAsync(ct);
        var peopleById = people.ToDictionary(p => p.Id);

        return projects
            .Select(project => ToProjectDto(project, assignments.Where(a => a.ProjectId == project.Id).ToList(), peopleById))
            .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<ProjectDto> CreateAsync(CreateProjectRequest request, CancellationToken ct = default)
    {
        var trimmed = request.Name.Trim();
        var exists = await db.Projects.AnyAsync(p => p.Name.ToLower() == trimmed.ToLower(), ct);
        if (exists) throw new DuplicateProjectNameException(trimmed);

        var palette = new[]
        {
            "#2478D8", "#00A86C", "#E4661C", "#6B3FC4", "#0E7C86", "#C2185B",
            "#B8860B", "#3F51B5", "#00897B", "#8E24AA", "#5D4037", "#455A64"
        };
        var index = await db.Projects.CountAsync(ct);

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = trimmed,
            Owner = string.IsNullOrWhiteSpace(request.Owner) ? "—" : request.Owner,
            Description = request.Description,
            Tech = (request.Tech ?? string.Empty)
                .Split(',', '/')
                .Select(s => s.Trim())
                .Where(s => s.Length > 0)
                .ToList(),
            State = request.State,
            Color = palette[index % palette.Length],
            PlannedStart = request.PlannedStart,
            PlannedEnd = request.PlannedEnd
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync(ct);

        await activity.LogAsync(
            ActivityActionType.ProjectCreated, $"\"{project.Name}\" created",
            [ActivitySnapshot.Entry("Project", project.Id, project.Name, before: null, after: project)], ct);

        return ToProjectDto(project, [], new Dictionary<Guid, Person>());
    }

    // Rule 5: mark complete — truncates future-ending assignments, never deletes history.
    public async Task<MarkCompleteResult> MarkCompleteAsync(Guid id, CancellationToken ct = default)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new ProjectNotFoundException(id);
        var assignments = await db.Assignments.Where(a => a.ProjectId == id).ToListAsync(ct);

        var projectBefore = CloneProject(project);
        var assignmentsBefore = assignments.ToDictionary(a => a.Id, CloneAssignment);

        var freedCount = AllocationRules.MarkComplete(project, assignments, clock.Today);
        await db.SaveChangesAsync(ct);

        var message = freedCount switch
        {
            0 => $"{project.Name} marked complete",
            1 => $"{project.Name} marked complete — 1 person freed up",
            _ => $"{project.Name} marked complete — {freedCount} people freed up"
        };

        var entries = new List<ActivityEntry>
        {
            ActivitySnapshot.Entry("Project", project.Id, project.Name, projectBefore, project)
        };
        entries.AddRange(assignments
            .Where(a => a.End != assignmentsBefore[a.Id].End) // only the truncated ones actually changed
            .Select(a => ActivitySnapshot.Entry("Assignment", a.Id, $"{project.Name} — {a.Work}", assignmentsBefore[a.Id], a)));

        await activity.LogAsync(ActivityActionType.ProjectMarkedComplete, message, entries, ct);

        return new MarkCompleteResult(freedCount, message);
    }

    /// <summary>Tentative → Active: the project's assignments start counting toward capacity.</summary>
    public async Task ConfirmAsync(Guid id, CancellationToken ct = default)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new ProjectNotFoundException(id);
        if (project.State != ProjectState.Tentative) throw new ProjectNotTentativeException(project.Name);
        var before = CloneProject(project);
        AllocationRules.Confirm(project);
        await db.SaveChangesAsync(ct);

        await activity.LogAsync(
            ActivityActionType.ProjectConfirmed, $"{project.Name} confirmed — its work now counts toward capacity",
            [ActivitySnapshot.Entry("Project", project.Id, project.Name, before, project)], ct);
    }

    // Rule 6: reopen — does not restore truncated end dates.
    public async Task ReopenAsync(Guid id, CancellationToken ct = default)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new ProjectNotFoundException(id);
        var before = CloneProject(project);
        AllocationRules.Reopen(project);
        await db.SaveChangesAsync(ct);

        await activity.LogAsync(
            ActivityActionType.ProjectReopened, $"{project.Name} reopened — re-staff it from Allocation",
            [ActivitySnapshot.Entry("Project", project.Id, project.Name, before, project)], ct);
    }

    private static Project CloneProject(Project p) => new()
    {
        Id = p.Id, Name = p.Name, Owner = p.Owner, Description = p.Description, Tech = new List<string>(p.Tech),
        State = p.State, Color = p.Color, CompletedOn = p.CompletedOn, PlannedStart = p.PlannedStart, PlannedEnd = p.PlannedEnd
    };

    private static Assignment CloneAssignment(Assignment a) => new()
    {
        Id = a.Id, PersonId = a.PersonId, ProjectId = a.ProjectId, Work = a.Work, Alloc = a.Alloc, Start = a.Start, End = a.End,
        DeadlineExtensions = a.DeadlineExtensions.ToList()
    };

    public async Task<CompletedStatsDto> GetCompletedStatsAsync(CancellationToken ct = default)
    {
        var allProjects = await db.Projects.AsNoTracking().ToListAsync(ct);
        var assignments = await db.Assignments.AsNoTracking().ToListAsync(ct);

        var completed = allProjects.Where(p => p.State == ProjectState.Completed).ToList();
        var live = allProjects.Where(p => p.State != ProjectState.Completed).ToList();

        var totalEffort = completed.Sum(p =>
            assignments.Where(a => a.ProjectId == p.Id)
                .Sum(a => AllocationRules.EffortPersonDays(a.Start, a.End, a.Alloc)));

        var peopleInvolved = completed
            .SelectMany(p => assignments.Where(a => a.ProjectId == p.Id).Select(a => a.PersonId))
            .Distinct()
            .Count();

        var unstaffedLive = live.Count(p => !assignments.Any(a => a.ProjectId == p.Id));

        return new CompletedStatsDto(completed.Count, totalEffort, peopleInvolved, live.Count, unstaffedLive);
    }

    public async Task<List<CompletedProjectDto>> GetCompletedAsync(CancellationToken ct = default)
    {
        var completed = await db.Projects.AsNoTracking()
            .Where(p => p.State == ProjectState.Completed)
            .ToListAsync(ct);
        var assignments = await db.Assignments.AsNoTracking().ToListAsync(ct);
        var people = await db.People.AsNoTracking().ToListAsync(ct);
        var peopleById = people.ToDictionary(p => p.Id);

        return completed
            .OrderByDescending(p => p.CompletedOn)
            .Select(project => ToCompletedDto(project, assignments.Where(a => a.ProjectId == project.Id).ToList(), peopleById))
            .ToList();
    }

    private ProjectDto ToProjectDto(Project project, List<Assignment> assignments, IReadOnlyDictionary<Guid, Person> peopleById)
    {
        var today = clock.Today;
        // A tentative project's own staffing still shows here (it just doesn't count toward
        // people's load), so it doesn't look unstaffed.
        var cells = assignments
            .Select(a => new ProjectPersonCellDto(
                a.PersonId, a.Id, a.Alloc,
                AllocationRules.IsActive(a, project, today) || AllocationRules.IsTentative(a, project, today),
                a.Work, a.Start, a.End))
            .ToList();

        var activeCells = cells.Where(c => c.Active).ToList();
        var totalStaffed = activeCells.Sum(c => c.Alloc);
        var headCount = activeCells.Select(c => c.PersonId).Distinct().Count();

        return new ProjectDto(
            project.Id, project.Name, project.Owner, project.Description, project.Tech,
            project.State, project.Color, project.CompletedOn,
            totalStaffed, headCount, AllocationRules.GetLoadBand(totalStaffed), cells);
    }

    private CompletedProjectDto ToCompletedDto(Project project, List<Assignment> assignments, IReadOnlyDictionary<Guid, Person> peopleById)
    {
        var contributors = assignments
            .GroupBy(a => a.PersonId)
            .Select(group =>
            {
                var person = peopleById.GetValueOrDefault(group.Key);
                var work = string.Join("; ", group.Select(a => a.Work).Distinct());
                var periodStart = group.Min(a => a.Start);
                var periodEnd = group.Max(a => a.End);
                var effort = group.Sum(a => AllocationRules.EffortPersonDays(a.Start, a.End, a.Alloc));

                return new ContributorDto(
                    group.Key,
                    person?.Name ?? "Former member",
                    person is null ? "No longer on the team" : person.Role,
                    person?.Color,
                    person is null,
                    work,
                    group.Count(),
                    periodStart,
                    periodEnd,
                    periodEnd.DayNumber - periodStart.DayNumber + 1,
                    group.Max(a => a.Alloc),
                    effort);
            })
            .OrderByDescending(c => c.EffortPersonDays)
            .ToList();

        var ranFor = assignments.Count > 0 && project.CompletedOn is { } completedOn
            ? completedOn.DayNumber - assignments.Min(a => a.Start).DayNumber
            : 0;

        return new CompletedProjectDto(
            project.Id, project.Name, project.Owner, project.Tech, project.Color,
            project.CompletedOn ?? clock.Today,
            contributors.Count,
            contributors.Sum(c => c.EffortPersonDays),
            ranFor,
            assignments.Count,
            contributors);
    }
}
