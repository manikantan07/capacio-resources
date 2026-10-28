using DeliveryHub.Domain;

namespace DeliveryHub.Application.Dtos;

public record LoginRequest(string Email, string Password, bool RememberMe = false);

public record MeDto(string Email, string DisplayName, AppRole Role);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
