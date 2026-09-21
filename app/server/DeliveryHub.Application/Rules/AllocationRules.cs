using DeliveryHub.Domain;

namespace DeliveryHub.Application.Rules;

public readonly record struct SkillMatchResult(
    IReadOnlyList<string> Hit,
    IReadOnlyList<string> Need,
    IReadOnlyList<string> Missing,
    SkillMatchLevel Level);

/// <summary>
/// Business rules ported 1:1 from design_handoff_delivery_hub/README.md
/// ("Core business rules", rules 1-9). Pure functions — no I/O, fully unit-testable.
/// </summary>
public static class AllocationRules
{
    // Rule 1: an assignment is "active" when the project isn't completed and today falls in [start, end].
    public static bool IsActive(Assignment assignment, Project project, DateOnly today) =>
        project.State != ProjectState.Completed
        && assignment.Start <= today
        && assignment.End >= today;

    // Rule 2: a person's current load = sum of alloc over their active assignments. Can exceed 100.
    public static int CalculateLoad(
        IEnumerable<Assignment> personAssignments,
        Func<Guid, Project?> projectLookup,
        DateOnly today)
    {
        var total = 0;
        foreach (var assignment in personAssignments)
        {
            var project = projectLookup(assignment.ProjectId);
            if (project is not null && IsActive(assignment, project, today))
            {
                total += assignment.Alloc;
            }
        }
        return total;
    }

    // Rule 3: load bands drive every capacity color in the app.
    public static LoadBand GetLoadBand(int load) => load switch
    {
        > 100 => LoadBand.OverAllocated,
        100 => LoadBand.FullyAllocated,
        > 0 => LoadBand.PartiallyAvailable,
        _ => LoadBand.Available
    };

    public static string LoadBandLabel(LoadBand band) => band switch
    {
        LoadBand.OverAllocated => "Over-allocated",
        LoadBand.FullyAllocated => "Fully allocated",
        LoadBand.PartiallyAvailable => "Partially available",
        LoadBand.Available => "Available",
        _ => throw new ArgumentOutOfRangeException(nameof(band))
    };

    public static string LoadBandShortLabel(LoadBand band) => band switch
    {
        LoadBand.OverAllocated => "Over",
        LoadBand.FullyAllocated => "Full",
        LoadBand.PartiallyAvailable => "Partial",
        LoadBand.Available => "Free",
        _ => throw new ArgumentOutOfRangeException(nameof(band))
    };

    // Rule 4: skill match — split on commas/slashes, trim, case-insensitive substring match either direction.
    public static SkillMatchResult MatchSkills(IEnumerable<string> personSkills, IEnumerable<string> projectTech)
    {
        var skills = Normalize(personSkills);
        var need = Normalize(projectTech);

        var hit = new List<string>();
        var missing = new List<string>();

        foreach (var requirement in need)
        {
            var isHit = skills.Any(skill =>
                skill.Contains(requirement, StringComparison.OrdinalIgnoreCase) ||
                requirement.Contains(skill, StringComparison.OrdinalIgnoreCase));

            if (isHit) hit.Add(requirement);
            else missing.Add(requirement);
        }

        var level = need.Count == 0 || hit.Count == need.Count
            ? SkillMatchLevel.Full
            : hit.Count > 0
                ? SkillMatchLevel.Partial
                : SkillMatchLevel.None;

        return new SkillMatchResult(hit, need, missing, level);
    }

    private static List<string> Normalize(IEnumerable<string> raw) =>
        raw.SelectMany(s => s.Split(',', '/'))
           .Select(s => s.Trim())
           .Where(s => s.Length > 0)
           .Distinct(StringComparer.OrdinalIgnoreCase)
           .ToList();

    // Rule 5: mark project complete — sets state/completedOn and truncates future-ending assignments to today.
    // Returns the number of people freed (distinct people whose active assignment on this project just ended).
    public static int MarkComplete(Project project, IEnumerable<Assignment> projectAssignments, DateOnly today)
    {
        var freedPeople = new HashSet<Guid>();

        foreach (var assignment in projectAssignments)
        {
            var wasActive = IsActive(assignment, project, today);
            if (assignment.End > today)
            {
                assignment.End = today;
            }
            if (wasActive)
            {
                freedPeople.Add(assignment.PersonId);
            }
        }

        project.State = ProjectState.Completed;
        project.CompletedOn = today;

        return freedPeople.Count;
    }

    // Rule 6: reopen project — does not restore truncated end dates.
    public static void Reopen(Project project)
    {
        project.State = ProjectState.Active;
        project.CompletedOn = null;
    }

    // Rule 7: removing a person is blocked while they hold any active assignment.
    public static bool CanRemovePerson(Guid personId, IEnumerable<Assignment> assignments, Func<Guid, Project?> projectLookup, DateOnly today) =>
        !assignments
            .Where(a => a.PersonId == personId)
            .Any(a =>
            {
                var project = projectLookup(a.ProjectId);
                return project is not null && IsActive(a, project, today);
            });

    // Rule 9: effort in person-days = span_days * alloc/100, span_days = round((end-start)/1day)+1, minimum 1.
    public static decimal EffortPersonDays(DateOnly start, DateOnly end, int alloc)
    {
        var rawDays = end.DayNumber - start.DayNumber + 1;
        var spanDays = Math.Max(rawDays, 1);
        return Math.Round(spanDays * (alloc / 100m), 1, MidpointRounding.AwayFromZero);
    }
}
