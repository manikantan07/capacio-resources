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

    /// <summary>The end date as of the most recently recorded missed deadline. Null until one's been recorded.</summary>
    public DateOnly? OriginalDeadline { get; set; }

    /// <summary>Reason given for that most recently recorded missed deadline.</summary>
    public string? ExtensionReason { get; set; }
}
