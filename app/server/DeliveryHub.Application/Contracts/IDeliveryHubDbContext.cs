using DeliveryHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Application.Contracts;

/// <summary>
/// Persistence seam implemented by DeliveryHub.Infrastructure. Lets Application stay
/// EF-Core-provider-agnostic (same interface works against Azure SQL in prod and the
/// local SQL Server container in dev — only the connection string differs).
/// </summary>
public interface IDeliveryHubDbContext
{
    DbSet<Person> People { get; }
    DbSet<Project> Projects { get; }
    DbSet<Assignment> Assignments { get; }
    DbSet<ActivityLog> ActivityLogs { get; }
    DbSet<AppUser> AppUsers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
