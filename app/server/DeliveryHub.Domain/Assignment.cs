namespace DeliveryHub.Domain;

public class Assignment
{
    public Guid Id { get; set; }

    // No enforced FK to Person: a person can be hard-deleted (rule 7 only blocks this
    // while they hold an active assignment) while their historical, inactive
    // assignments remain — the Completed page resolves a missing person as
    // "Former member". See DeliveryHubDbContext for the corresponding EF config.
    public Guid PersonId { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public string Work { get; set; } = string.Empty;

    /// <summary>Percent of the person's capacity, 5-100. UI steps by 25 but the model allows any integer.</summary>
    public int Alloc { get; set; }

    public DateOnly Start { get; set; }
    public DateOnly End { get; set; }
    public List<DeadlineExtension> DeadlineExtensions { get; set; } = [];
}

public record DeadlineExtension(DateOnly PreviousDeadline, DateOnly NewDeadline, string Reason, DateTime RecordedAt)
{
    // Existing saved entries were explicitly recorded as missed deadlines.
    public string ChangeType { get; init; } = "DeadlineMissed";
    public string ReasonCategory { get; init; } = "";
}
