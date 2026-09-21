namespace DeliveryHub.Domain;

public enum AppRole
{
    Owner,
    Viewer
}

/// <summary>
/// A login account. Deliberately separate from Person (a Person is a team member who
/// may or may not ever sign in; an AppUser is a credential). PasswordHash is produced
/// by Microsoft.AspNetCore.Identity.PasswordHasher&lt;AppUser&gt; — never store or log
/// a plaintext password.
/// </summary>
public class AppUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public AppRole Role { get; set; }
    public DateTime CreatedAt { get; set; }
}
