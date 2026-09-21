using DeliveryHub.Application.Rules;
using DeliveryHub.Domain;
using Xunit;

namespace DeliveryHub.Tests;

public class AllocationRulesTests
{
    private static readonly DateOnly Today = new(2026, 9, 1);

    private static Project MakeProject(ProjectState state = ProjectState.Active) =>
        new() { Id = Guid.NewGuid(), Name = "P", State = state, Color = "#000" };

    private static Assignment MakeAssignment(Guid projectId, DateOnly start, DateOnly end, int alloc = 100) =>
        new() { Id = Guid.NewGuid(), PersonId = Guid.NewGuid(), ProjectId = projectId, Start = start, End = end, Alloc = alloc, Work = "w" };

    // Rule 1
    [Fact]
    public void IsActive_TrueWhenTodayWithinRangeAndProjectNotCompleted()
    {
        var project = MakeProject();
        var assignment = MakeAssignment(project.Id, Today.AddDays(-5), Today.AddDays(5));
        Assert.True(AllocationRules.IsActive(assignment, project, Today));
    }

    [Fact]
    public void IsActive_FalseWhenProjectCompleted()
    {
        var project = MakeProject(ProjectState.Completed);
        var assignment = MakeAssignment(project.Id, Today.AddDays(-5), Today.AddDays(5));
        Assert.False(AllocationRules.IsActive(assignment, project, Today));
    }

    [Fact]
    public void IsActive_FalseWhenEndBeforeToday()
    {
        var project = MakeProject();
        var assignment = MakeAssignment(project.Id, Today.AddDays(-10), Today.AddDays(-1));
        Assert.False(AllocationRules.IsActive(assignment, project, Today));
    }

    [Fact]
    public void IsActive_FalseWhenBacklogged()
    {
        var project = MakeProject();
        var assignment = MakeAssignment(project.Id, Today.AddDays(-5), Today.AddDays(5));
        assignment.Backlogged = true;
        Assert.False(AllocationRules.IsActive(assignment, project, Today));
    }

    // Rule 10
    [Fact]
    public void IsDeadlineMissed_TrueWhenEndBeforeTodayAndNotBacklogged()
    {
        var project = MakeProject();
        var assignment = MakeAssignment(project.Id, Today.AddDays(-10), Today.AddDays(-1));
        Assert.True(AllocationRules.IsDeadlineMissed(assignment, project, Today));
    }

    [Fact]
    public void IsDeadlineMissed_FalseWhenBacklogged()
    {
        var project = MakeProject();
        var assignment = MakeAssignment(project.Id, Today.AddDays(-10), Today.AddDays(-1));
        assignment.Backlogged = true;
        Assert.False(AllocationRules.IsDeadlineMissed(assignment, project, Today));
    }

    [Fact]
    public void IsDeadlineMissed_FalseWhenEndStillInFuture()
    {
        var project = MakeProject();
        var assignment = MakeAssignment(project.Id, Today.AddDays(-5), Today.AddDays(5));
        Assert.False(AllocationRules.IsDeadlineMissed(assignment, project, Today));
    }

    [Fact]
    public void IsDeadlineMissed_FalseWhenProjectCompleted()
    {
        var project = MakeProject(ProjectState.Completed);
        var assignment = MakeAssignment(project.Id, Today.AddDays(-10), Today.AddDays(-1));
        Assert.False(AllocationRules.IsDeadlineMissed(assignment, project, Today));
    }

    // Rule 2
    [Fact]
    public void CalculateLoad_SumsOnlyActiveAssignments_CanExceed100()
    {
        var active1 = MakeProject();
        var active2 = MakeProject();
        var completed = MakeProject(ProjectState.Completed);
        var projects = new[] { active1, active2, completed }.ToDictionary(p => p.Id);

        var assignments = new[]
        {
            MakeAssignment(active1.Id, Today.AddDays(-1), Today.AddDays(1), 60),
            MakeAssignment(active2.Id, Today.AddDays(-1), Today.AddDays(1), 60),
            MakeAssignment(completed.Id, Today.AddDays(-1), Today.AddDays(1), 100), // excluded
        };

        var load = AllocationRules.CalculateLoad(assignments, id => projects.GetValueOrDefault(id), Today);
        Assert.Equal(120, load);
    }

    // Rule 3
    [Theory]
    [InlineData(0, LoadBand.Available)]
    [InlineData(50, LoadBand.PartiallyAvailable)]
    [InlineData(100, LoadBand.FullyAllocated)]
    [InlineData(125, LoadBand.OverAllocated)]
    public void GetLoadBand_MatchesSpec(int load, LoadBand expected) =>
        Assert.Equal(expected, AllocationRules.GetLoadBand(load));

    // Rule 4
    [Fact]
    public void MatchSkills_FullMatchWhenAllRequirementsHit()
    {
        var result = AllocationRules.MatchSkills(["React", "WP", "API integration"], ["React / WP"]);
        Assert.Equal(SkillMatchLevel.Full, result.Level);
    }

    [Fact]
    public void MatchSkills_PartialMatchWhenSomeHit()
    {
        var result = AllocationRules.MatchSkills(["React"], ["React", "Drupal"]);
        Assert.Equal(SkillMatchLevel.Partial, result.Level);
        Assert.Contains("Drupal", result.Missing);
    }

    [Fact]
    public void MatchSkills_NoneWhenNothingHits()
    {
        var result = AllocationRules.MatchSkills(["SEO"], ["React", "Drupal"]);
        Assert.Equal(SkillMatchLevel.None, result.Level);
    }

    // Rule 5
    [Fact]
    public void MarkComplete_TruncatesFutureEndsAndCountsFreedPeople()
    {
        var project = MakeProject();
        var stillActive = MakeAssignment(project.Id, Today.AddDays(-5), Today.AddDays(10)); // freed
        var alreadyEnded = MakeAssignment(project.Id, Today.AddDays(-20), Today.AddDays(-1)); // not freed, not truncated
        var assignments = new[] { stillActive, alreadyEnded };

        var freed = AllocationRules.MarkComplete(project, assignments, Today);

        Assert.Equal(1, freed);
        Assert.Equal(ProjectState.Completed, project.State);
        Assert.Equal(Today, project.CompletedOn);
        Assert.Equal(Today, stillActive.End); // truncated
        Assert.Equal(Today.AddDays(-1), alreadyEnded.End); // untouched, history preserved
    }

    // Rule 6
    [Fact]
    public void Reopen_ClearsCompletedStateButDoesNotRestoreEndDates()
    {
        var project = MakeProject(ProjectState.Completed);
        project.CompletedOn = Today;
        AllocationRules.Reopen(project);

        Assert.Equal(ProjectState.Active, project.State);
        Assert.Null(project.CompletedOn);
    }

    // Rule 7
    [Fact]
    public void CanRemovePerson_FalseWhileActiveAssignmentExists()
    {
        var personId = Guid.NewGuid();
        var project = MakeProject();
        var assignment = MakeAssignment(project.Id, Today.AddDays(-1), Today.AddDays(1));
        assignment.PersonId = personId;
        var projects = new Dictionary<Guid, Project> { [project.Id] = project };

        Assert.False(AllocationRules.CanRemovePerson(personId, [assignment], id => projects.GetValueOrDefault(id), Today));
    }

    [Fact]
    public void CanRemovePerson_TrueWhenNoActiveAssignments()
    {
        var personId = Guid.NewGuid();
        var project = MakeProject();
        var ended = MakeAssignment(project.Id, Today.AddDays(-20), Today.AddDays(-1));
        ended.PersonId = personId;
        var projects = new Dictionary<Guid, Project> { [project.Id] = project };

        Assert.True(AllocationRules.CanRemovePerson(personId, [ended], id => projects.GetValueOrDefault(id), Today));
    }

    // Rule 9
    [Fact]
    public void EffortPersonDays_ComputesSpanTimesAlloc()
    {
        // 10 days inclusive span, 50% alloc -> 5.0 person-days
        var effort = AllocationRules.EffortPersonDays(new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 10), 50);
        Assert.Equal(5.0m, effort);
    }

    [Fact]
    public void EffortPersonDays_MinimumOneDaySpan()
    {
        var effort = AllocationRules.EffortPersonDays(new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 1), 100);
        Assert.Equal(1.0m, effort);
    }
}
