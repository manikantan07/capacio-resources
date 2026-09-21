using DeliveryHub.Domain;

namespace DeliveryHub.Application.Dtos;

public record ActivityEntryDto(string EntityType, string EntityId, string Label, string? BeforeJson, string? AfterJson);

public record ActivityLogDto(
    Guid Id,
    DateTime OccurredAt,
    string ActorEmail,
    ActivityActionType ActionType,
    string Summary,
    List<ActivityEntryDto> Entries,
    bool Undone,
    DateTime? UndoneAt,
    Guid? OriginalActivityId);

public record ActivityHistoryPage(List<ActivityLogDto> Items, int TotalCount, int Page, int PageSize);

public record UndoActivitiesRequest(List<Guid> ActivityIds);

public record UndoOutcome(Guid ActivityId, bool Success, string Message);

public record UndoActivitiesResult(List<UndoOutcome> Outcomes);
