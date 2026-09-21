using DeliveryHub.Domain;

namespace DeliveryHub.Application.Contracts;

public interface IActivityLogger
{
    Task LogAsync(ActivityActionType actionType, string summary, List<ActivityEntry> entries, CancellationToken ct = default);
}

/// <summary>
/// Who is making the current request. Until real Entra ID auth lands, this reads the
/// client-sent X-Actor-Email header (see ActorContextMiddleware in DeliveryHub.Api) —
/// a placeholder that gets replaced by the validated token's identity later.
/// </summary>
public interface IActorProvider
{
    string CurrentActorEmail { get; }
}
