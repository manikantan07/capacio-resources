using DeliveryHub.Application.Activity;
using DeliveryHub.Application.Contracts;
using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Rules;
using DeliveryHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Application.Services;

public class PersonNotFoundException(Guid id) : Exception($"Person '{id}' was not found.");
public class DuplicatePersonNameException(string name) : Exception($"A person named '{name}' already exists.");
public class PersonHasActiveAssignmentsException(string name)
    : Exception($"{name} still has active assignments — move those first.");

public class PeopleService(IDeliveryHubDbContext db, IDateProvider clock, IActivityLogger activity)
{
    public async Task<List<PersonDto>> GetAllAsync(CancellationToken ct = default)
    {
        var people = await db.People.AsNoTracking().ToListAsync(ct);
        var assignments = await db.Assignments.AsNoTracking().ToListAsync(ct);
        var projects = await db.Projects.AsNoTracking().ToListAsync(ct);
        var projectsById = projects.ToDictionary(p => p.Id);

        return people
            .Select(p => ToDto(p, assignments.Where(a => a.PersonId == p.Id).ToList(), projectsById))
            .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<PersonDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var person = await db.People.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new PersonNotFoundException(id);
        var assignments = await db.Assignments.AsNoTracking().Where(a => a.PersonId == id).ToListAsync(ct);
        var projects = await db.Projects.AsNoTracking().ToListAsync(ct);
        return ToDto(person, assignments, projects.ToDictionary(p => p.Id));
    }

    public async Task<PersonDto> CreateAsync(CreatePersonRequest request, CancellationToken ct = default)
    {
        await EnsureUniqueName(request.Name, null, ct);

        var skills = (request.Skills ?? string.Empty)
            .Split(',')
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .ToList();

        var palette = new[]
        {
            "#2478D8", "#00A86C", "#E4661C", "#6B3FC4", "#0E7C86", "#C2185B",
            "#B8860B", "#3F51B5", "#00897B", "#8E24AA", "#5D4037", "#455A64"
        };
        var index = await db.People.CountAsync(ct);

        var person = new Person
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Initials = DeriveInitials(request.Name),
            Color = palette[index % palette.Length],
            Role = "Frontend Engineer",
            Type = PersonType.FullTime,
            Email = string.Empty,
            Status = PersonStatus.Active,
            Hours = "40",
            Skills = skills
        };

        db.People.Add(person);
        await db.SaveChangesAsync(ct);

        await activity.LogAsync(
            ActivityActionType.PersonCreated, $"{person.Name} added to the team",
            [ActivitySnapshot.Entry("Person", person.Id, person.Name, before: null, after: person)], ct);

        return ToDto(person, [], new Dictionary<Guid, Project>());
    }

    public async Task<PersonDto> UpdateAsync(Guid id, UpdatePersonRequest request, CancellationToken ct = default)
    {
        var person = await db.People.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new PersonNotFoundException(id);

        var before = ClonePerson(person);

        await EnsureUniqueName(request.Name, id, ct);

        person.Name = request.Name.Trim();
        person.Initials = DeriveInitials(request.Name);
        person.Role = request.Role;
        person.Type = request.Type;
        person.Email = request.Email;
        person.Phone = request.Phone;
        person.Location = request.Location;
        person.Status = request.Status;
        person.Hours = request.Hours;
        person.Joined = request.Joined;
        person.Skills = request.Skills
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        person.Notes = request.Notes;

        await db.SaveChangesAsync(ct);

        await activity.LogAsync(
            ActivityActionType.PersonUpdated, $"{person.Name}'s profile updated",
            [ActivitySnapshot.Entry("Person", person.Id, person.Name, before, person)], ct);

        var assignments = await db.Assignments.AsNoTracking().Where(a => a.PersonId == id).ToListAsync(ct);
        var projects = await db.Projects.AsNoTracking().ToListAsync(ct);
        return ToDto(person, assignments, projects.ToDictionary(p => p.Id));
    }

    // Rule 7: removing a person is blocked while they hold any active assignment.
    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var person = await db.People.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new PersonNotFoundException(id);

        var assignments = await db.Assignments.AsNoTracking().Where(a => a.PersonId == id).ToListAsync(ct);
        var projects = await db.Projects.AsNoTracking().ToListAsync(ct);
        var projectsById = projects.ToDictionary(p => p.Id);

        var canRemove = AllocationRules.CanRemovePerson(
            id, assignments, pid => projectsById.GetValueOrDefault(pid), clock.Today);

        if (!canRemove)
        {
            throw new PersonHasActiveAssignmentsException(person.Name);
        }

        db.People.Remove(person);
        await db.SaveChangesAsync(ct);

        await activity.LogAsync(
            ActivityActionType.PersonDeleted, $"{person.Name} removed from the team",
            [ActivitySnapshot.Entry("Person", person.Id, person.Name, before: person, after: null)], ct);
    }

    private static Person ClonePerson(Person p) => new()
    {
        Id = p.Id, Name = p.Name, Initials = p.Initials, Color = p.Color, Role = p.Role, Type = p.Type,
        Email = p.Email, Phone = p.Phone, Location = p.Location, Status = p.Status, Hours = p.Hours,
        Joined = p.Joined, Skills = new List<string>(p.Skills), Notes = p.Notes
    };

    private async Task EnsureUniqueName(string name, Guid? excludingId, CancellationToken ct)
    {
        var trimmed = name.Trim();
        var exists = await db.People.AnyAsync(
            p => p.Name.ToLower() == trimmed.ToLower() && p.Id != (excludingId ?? Guid.Empty), ct);
        if (exists) throw new DuplicatePersonNameException(trimmed);
    }

    private static string DeriveInitials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var initials = string.Concat(parts.Take(2).Select(p => char.ToUpperInvariant(p[0])));
        return initials.Length > 0 ? initials[..Math.Min(2, initials.Length)] : "?";
    }

    private PersonDto ToDto(Person person, List<Assignment> assignments, IReadOnlyDictionary<Guid, Project> projectsById)
    {
        var today = clock.Today;
        var load = AllocationRules.CalculateLoad(assignments, pid => projectsById.GetValueOrDefault(pid), today);
        var band = AllocationRules.GetLoadBand(load);

        var summaries = assignments
            .Select(a =>
            {
                var project = projectsById.GetValueOrDefault(a.ProjectId);
                var active = project is not null && AllocationRules.IsActive(a, project, today);
                return new AssignmentSummaryDto(
                    a.Id, a.ProjectId, project?.Name ?? "(unknown project)", project?.Color ?? "#8A9099",
                    a.Work, a.Alloc, a.Start, a.End, active);
            })
            .OrderByDescending(a => a.Active)
            .ThenBy(a => a.Start)
            .ToList();

        return new PersonDto(
            person.Id, person.Name, person.Initials, person.Color, person.Role, person.Type,
            person.Email, person.Phone, person.Location, person.Status, person.Hours, person.Joined,
            person.Skills, person.Notes,
            load, band, AllocationRules.LoadBandLabel(band), AllocationRules.LoadBandShortLabel(band),
            summaries);
    }
}
