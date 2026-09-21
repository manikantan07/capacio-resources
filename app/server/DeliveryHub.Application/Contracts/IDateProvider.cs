namespace DeliveryHub.Application.Contracts;

/// <summary>Seam for "today" so business rules stay testable without wall-clock dependence.</summary>
public interface IDateProvider
{
    DateOnly Today { get; }
}

public sealed class SystemDateProvider : IDateProvider
{
    public DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);
}
