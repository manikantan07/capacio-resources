namespace DeliveryHub.Domain;

public class Person
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public PersonType Type { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public PersonStatus Status { get; set; }
    public string Hours { get; set; } = "40";
    public DateOnly? Joined { get; set; }
    public List<string> Skills { get; set; } = new();
    public string? Notes { get; set; }
}
