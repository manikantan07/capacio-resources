using System.Text.Json;
using System.Text.Json.Serialization;
using DeliveryHub.Domain;

namespace DeliveryHub.Application.Activity;

/// <summary>Shared JSON shape for entity before/after snapshots stored on ActivityEntry.</summary>
public static class ActivitySnapshot
{
    // ReferenceHandler.IgnoreCycles: Assignment.Project <-> Project.Assignments is a real
    // object cycle once EF's change tracker fixes up both navigations for entities
    // tracked in the same context — without this, serializing an Assignment recurses
    // until it blows the stack.
    public static readonly JsonSerializerOptions Options = new(JsonSerializerOptions.Default)
    {
        Converters = { new JsonStringEnumConverter() },
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    public static ActivityEntry Entry(string entityType, Guid id, string label, object? before, object? after) => new()
    {
        EntityType = entityType,
        EntityId = id.ToString(),
        Label = label,
        BeforeJson = before is null ? null : JsonSerializer.Serialize(before, Options),
        AfterJson = after is null ? null : JsonSerializer.Serialize(after, Options)
    };
}
