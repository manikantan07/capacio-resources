using System.Security.Cryptography;
using DeliveryHub.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DeliveryHub.Infrastructure;

/// <summary>
/// Seeds the two accounts requested (an Owner with full edit rights, a Viewer with
/// read-only access) with cryptographically random temporary passwords on first run.
/// Idempotent — does nothing once any AppUser row exists. The generated passwords are
/// logged once so they can be handed to each person, who should change them via
/// POST /api/auth/change-password on first login.
/// </summary>
public static class AppUserSeeder
{
    public static async Task SeedAsync(DeliveryHubDbContext db, ILogger logger, CancellationToken ct = default)
    {
        if (await db.AppUsers.AnyAsync(ct)) return;

        var hasher = new PasswordHasher<AppUser>();
        var accounts = new (string Email, string Name, AppRole Role)[]
        {
            ("manikantan@applab.qa", "Mani", AppRole.Owner),
            ("visitor@applab.qa", "Head", AppRole.Viewer),
        };

        foreach (var (email, name, role) in accounts)
        {
            var tempPassword = GenerateTempPassword();
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                DisplayName = name,
                Role = role,
                CreatedAt = DateTime.UtcNow,
            };
            user.PasswordHash = hasher.HashPassword(user, tempPassword);
            db.AppUsers.Add(user);

            logger.LogWarning("Seeded {Role} account {Email} — temporary password: {Password} (change via POST /api/auth/change-password)", role, email, tempPassword);
        }

        await db.SaveChangesAsync(ct);
    }

    private static string GenerateTempPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
        var bytes = RandomNumberGenerator.GetBytes(16);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
    }
}
