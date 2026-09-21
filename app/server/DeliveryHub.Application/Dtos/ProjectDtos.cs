using DeliveryHub.Domain;

namespace DeliveryHub.Application.Dtos;

public record ProjectPersonCellDto(
    Guid PersonId,
    Guid AssignmentId,
    int Alloc,
    bool Active,
    string Work,
    DateOnly Start,
    DateOnly End);

public record ProjectDto(
    Guid Id,
    string Name,
    string? Owner,
    string? Description,
    List<string> Tech,
    ProjectState State,
    string Color,
    DateOnly? CompletedOn,
    int TotalStaffedPercent,
    int HeadCount,
    LoadBand Band,
    List<ProjectPersonCellDto> Cells);

public record CreateProjectRequest(
    string Name,
    string? Owner,
    string? Description,
    string? Tech,
    DateOnly? PlannedStart,
    DateOnly? PlannedEnd,
    ProjectState State);

public record MarkCompleteResult(int FreedCount, string Message);
