using DeliveryHub.Application.Contracts;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using DeliveryHub.Domain;

namespace DeliveryHub.Application.Services;

public class InvalidCredentialsException() : Exception("That email or password isn't right.");

public class AuthService(IDeliveryHubDbContext db)
{
    private readonly PasswordHasher<AppUser> hasher = new();

    /// <summary>Returns the authenticated user, or null if the email/password didn't match.</summary>
    public async Task<AppUser?> ValidateCredentialsAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Email.ToLower() == email.Trim().ToLower(), ct);
        if (user is null) return null;

        var result = hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return result == PasswordVerificationResult.Failed ? null : user;
    }

    public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken ct = default)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidCredentialsException();

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, currentPassword) == PasswordVerificationResult.Failed)
        {
            throw new InvalidCredentialsException();
        }

        user.PasswordHash = hasher.HashPassword(user, newPassword);
        await db.SaveChangesAsync(ct);
    }
}
