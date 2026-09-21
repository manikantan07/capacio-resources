namespace DeliveryHub.Domain;

public class Project
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Owner { get; set; }
    public string? Description { get; set; }
    public List<string> Tech { get; set; } = new();
    public ProjectState State { get; set; }
    public string Color { get; set; } = string.Empty;
    public DateOnly? CompletedOn { get; set; }
    public DateOnly? PlannedStart { get; set; }
    public DateOnly? PlannedEnd { get; set; }

    public List<Assignment> Assignments { get; set; } = new();
}
