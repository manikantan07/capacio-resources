using DeliveryHub.Domain;

namespace DeliveryHub.Application.Dtos;

public record LoginRequest(string Email, string Password);

public record MeDto(string Email, string DisplayName, AppRole Role);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
