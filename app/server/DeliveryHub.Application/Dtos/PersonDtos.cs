using DeliveryHub.Domain;

namespace DeliveryHub.Application.Dtos;

public record AssignmentSummaryDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string ProjectColor,
    string Work,
    int Alloc,
    DateOnly Start,
    DateOnly End,
    bool Active);

public record PersonDto(
    Guid Id,
    string Name,
    string Initials,
    string Color,
    string Role,
    PersonType Type,
    string Email,
    string? Phone,
    string? Location,
    PersonStatus Status,
    string Hours,
    DateOnly? Joined,
    List<string> Skills,
    string? Notes,
    int Load,
    LoadBand Band,
    string BandLabel,
    string BandShortLabel,
    List<AssignmentSummaryDto> Assignments);

public record CreatePersonRequest(string Name, string? Skills);

public record UpdatePersonRequest(
    string Name,
    string Role,
    PersonType Type,
    string Email,
    string? Phone,
    string? Location,
    PersonStatus Status,
    string Hours,
    DateOnly? Joined,
    List<string> Skills,
    string? Notes);
