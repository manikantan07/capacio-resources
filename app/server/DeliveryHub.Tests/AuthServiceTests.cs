using DeliveryHub.Application.Services;
using DeliveryHub.Domain;
using DeliveryHub.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DeliveryHub.Tests;

public class AuthServiceTests
{
    private static (DeliveryHubDbContext db, AuthService auth) BuildStack()
    {
        var options = new DbContextOptionsBuilder<DeliveryHubDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new DeliveryHubDbContext(options);
        return (db, new AuthService(db));
    }

    private static AppUser SeedUser(DeliveryHubDbContext db, string email, string password, AppRole role)
    {
        var hasher = new PasswordHasher<AppUser>();
        var user = new AppUser { Id = Guid.NewGuid(), Email = email, DisplayName = email, Role = role, CreatedAt = DateTime.UtcNow };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.AppUsers.Add(user);
        db.SaveChanges();
        return user;
    }

    [Fact]
    public async Task ValidateCredentials_CorrectPassword_ReturnsUser()
    {
        var (db, auth) = BuildStack();
        SeedUser(db, "owner@applab.qa", "correct-horse", AppRole.Owner);

        var result = await auth.ValidateCredentialsAsync("owner@applab.qa", "correct-horse");

        Assert.NotNull(result);
        Assert.Equal(AppRole.Owner, result!.Role);
    }

    [Fact]
    public async Task ValidateCredentials_WrongPassword_ReturnsNull()
    {
        var (db, auth) = BuildStack();
        SeedUser(db, "owner@applab.qa", "correct-horse", AppRole.Owner);

        var result = await auth.ValidateCredentialsAsync("owner@applab.qa", "wrong-password");

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateCredentials_UnknownEmail_ReturnsNull()
    {
        var (_, auth) = BuildStack();

        var result = await auth.ValidateCredentialsAsync("nobody@applab.qa", "whatever");

        Assert.Null(result);
    }

    [Fact]
    public async Task ValidateCredentials_EmailIsCaseInsensitive()
    {
        var (db, auth) = BuildStack();
        SeedUser(db, "owner@applab.qa", "correct-horse", AppRole.Owner);

        var result = await auth.ValidateCredentialsAsync("Owner@AppLab.QA", "correct-horse");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_Throws()
    {
        var (db, auth) = BuildStack();
        var user = SeedUser(db, "owner@applab.qa", "correct-horse", AppRole.Owner);

        await Assert.ThrowsAsync<InvalidCredentialsException>(
            () => auth.ChangePasswordAsync(user.Id, "wrong-current", "new-password"));
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrentPassword_UpdatesHashSoOldPasswordNoLongerWorks()
    {
        var (db, auth) = BuildStack();
        var user = SeedUser(db, "owner@applab.qa", "correct-horse", AppRole.Owner);

        await auth.ChangePasswordAsync(user.Id, "correct-horse", "new-password");

        Assert.Null(await auth.ValidateCredentialsAsync("owner@applab.qa", "correct-horse"));
        Assert.NotNull(await auth.ValidateCredentialsAsync("owner@applab.qa", "new-password"));
    }
}
