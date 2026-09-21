using DeliveryHub.Application.Contracts;
using DeliveryHub.Domain;

namespace DeliveryHub.Infrastructure;

public class ActivityLogger(DeliveryHubDbContext db, IActorProvider actor) : IActivityLogger
{
    public async Task LogAsync(ActivityActionType actionType, string summary, List<ActivityEntry> entries, CancellationToken ct = default)
    {
        db.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            OccurredAt = DateTime.UtcNow,
            ActorEmail = actor.CurrentActorEmail,
            ActionType = actionType,
            Summary = summary,
            Entries = entries
        });
        await db.SaveChangesAsync(ct);
    }
}
