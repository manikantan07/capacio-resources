namespace DeliveryHub.Domain;

public enum ActivityActionType
{
    PersonCreated,
    PersonUpdated,
    PersonDeleted,
    ProjectCreated,
    ProjectMarkedComplete,
    ProjectReopened,
    AssignmentCreated,
    AssignmentAllocUpdated,
    AssignmentEdited,
    AssignmentDeleted,
    AssignmentReassigned,
    AssignmentDeadlineExtended,
    Undo
}

public class ActivityEntry
{
    public string EntityType { get; set; } = string.Empty; // "Person" | "Project" | "Assignment"
    public string EntityId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;

    /// <summary>Field snapshot before the change, as JSON. Null means this entry created the entity.</summary>
    public string? BeforeJson { get; set; }

    /// <summary>Field snapshot after the change, as JSON. Null means this entry deleted the entity.</summary>
    public string? AfterJson { get; set; }
}

public class ActivityLog
{
    public Guid Id { get; set; }
    public DateTime OccurredAt { get; set; }
    public string ActorEmail { get; set; } = "unknown";
    public ActivityActionType ActionType { get; set; }
    public string Summary { get; set; } = string.Empty;
    public List<ActivityEntry> Entries { get; set; } = new();
    public bool Undone { get; set; }
    public DateTime? UndoneAt { get; set; }

    /// <summary>Set only on an ActionType.Undo entry — the activity it undid.</summary>
    public Guid? OriginalActivityId { get; set; }
}
