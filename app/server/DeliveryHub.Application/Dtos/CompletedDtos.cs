namespace DeliveryHub.Application.Dtos;

public record ContributorDto(
    Guid PersonId,
    string PersonName,
    string PersonRole,
    string? PersonColor,
    bool FormerMember,
    string WorkSummary,
    int StintCount,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    int DaysOnProject,
    int PeakAlloc,
    decimal EffortPersonDays);

public record CompletedProjectDto(
    Guid Id,
    string Name,
    string? Owner,
    List<string> Tech,
    string Color,
    DateOnly CompletedOn,
    int ResourceCount,
    decimal TotalEffortPersonDays,
    int RanForDays,
    int AssignmentCount,
    List<ContributorDto> Contributors);

public record CompletedStatsDto(
    int CompletedCount,
    decimal TotalEffortPersonDays,
    int PeopleInvolved,
    int StillLiveCount,
    int UnstaffedLiveCount);
