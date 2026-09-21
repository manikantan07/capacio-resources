using DeliveryHub.Domain;

namespace DeliveryHub.Application.Dtos;

public record AssignmentDto(
    Guid Id,
    Guid PersonId,
    string PersonName,
    Guid ProjectId,
    string ProjectName,
    string Work,
    int Alloc,
    DateOnly Start,
    DateOnly End,
    bool Active);

public record CreateAssignmentRequest(
    Guid PersonId,
    Guid ProjectId,
    string Work,
    int Alloc,
    DateOnly Start,
    DateOnly End);

public record UpdateAllocRequest(int Alloc);

public record UpdateAssignmentRequest(string Work, int Alloc, DateOnly Start, DateOnly End);

public record ReassignRequest(Guid NewPersonId);

public record MovePreviewDto(Guid PersonId, string PersonName, int CurrentLoad, int ProjectedLoad, LoadBand ProjectedBand);

public record SkillMatchDto(
    IReadOnlyList<string> Hit,
    IReadOnlyList<string> Need,
    IReadOnlyList<string> Missing,
    SkillMatchLevel Level);
