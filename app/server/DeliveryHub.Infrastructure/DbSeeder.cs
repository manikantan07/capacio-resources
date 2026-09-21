using DeliveryHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Infrastructure;

/// <summary>
/// Seeds the fixtures from design_handoff_delivery_hub/data/seed-data.json
/// (7 people, 12 projects, 15 assignments) — idempotent, only runs against an empty DB.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(DeliveryHubDbContext db, CancellationToken ct = default)
    {
        if (await db.People.AnyAsync(ct)) return;

        var people = new[]
        {
            new Person { Id = Guid.NewGuid(), Name = "Sagar", Initials = "S", Color = "#2478D8", Role = "Frontend Engineer", Type = PersonType.FullTime, Email = "sagar@applab.qa", Location = "Doha, Qatar", Status = PersonStatus.Active, Hours = "40", Skills = ["React", "SEO", "speed"] },
            new Person { Id = Guid.NewGuid(), Name = "Safeela", Initials = "S", Color = "#00A86C", Role = "Frontend Engineer", Type = PersonType.FullTime, Email = "safeela@applab.qa", Location = "Doha, Qatar", Status = PersonStatus.Active, Hours = "40", Skills = ["React", "HTML"] },
            new Person { Id = Guid.NewGuid(), Name = "Divya", Initials = "D", Color = "#E4661C", Role = "Frontend Engineer", Type = PersonType.FullTime, Email = "divya@applab.qa", Location = "Doha, Qatar", Status = PersonStatus.Active, Hours = "40", Skills = ["React", "Next.js"] },
            new Person { Id = Guid.NewGuid(), Name = "Revathy", Initials = "R", Color = "#6B3FC4", Role = "Frontend Engineer", Type = PersonType.FullTime, Email = "revathy@applab.qa", Location = "Doha, Qatar", Status = PersonStatus.Active, Hours = "40", Skills = ["React"] },
            new Person { Id = Guid.NewGuid(), Name = "Arun KR", Initials = "AK", Color = "#0E7C86", Role = "Frontend Engineer", Type = PersonType.FullTime, Email = "arun@applab.qa", Location = "Doha, Qatar", Status = PersonStatus.Active, Hours = "40", Skills = ["React", "Drupal"] },
            new Person { Id = Guid.NewGuid(), Name = "Nihal", Initials = "N", Color = "#C2185B", Role = "Frontend Engineer", Type = PersonType.FullTime, Email = "nihal@applab.qa", Location = "Doha, Qatar", Status = PersonStatus.Active, Hours = "40", Skills = ["React", "HTML/CSS"] },
            new Person { Id = Guid.NewGuid(), Name = "Mani", Initials = "M", Color = "#B8860B", Role = "Frontend Engineer", Type = PersonType.FullTime, Email = "mani@applab.qa", Location = "Doha, Qatar", Status = PersonStatus.Active, Hours = "40", Skills = ["API integration", "React", "SEO", "style"] },
        };
        var p = people.ToDictionary(x => x.Name switch
        {
            "Sagar" => "p0", "Safeela" => "p1", "Divya" => "p2", "Revathy" => "p3",
            "Arun KR" => "p4", "Nihal" => "p5", "Mani" => "p6", _ => x.Name
        }, x => x.Id);

        var projects = new[]
        {
            new Project { Id = Guid.NewGuid(), Name = "Multiversity", Owner = "Lekha / Rida", Description = "React / WP / API integration", Tech = ["React", "WP", "API integration"], State = ProjectState.Active, Color = "#2478D8" },
            new Project { Id = Guid.NewGuid(), Name = "COM — Council of Ministers", Owner = "Aiman Rizwan", Description = "WP / SharePoint", Tech = ["WP", "SharePoint"], State = ProjectState.Active, Color = "#00A86C" },
            new Project { Id = Guid.NewGuid(), Name = "QU", Owner = "Mohita", Description = "Jira tickets", Tech = ["Jira tickets"], State = ProjectState.Active, Color = "#E4661C" },
            new Project { Id = Guid.NewGuid(), Name = "HBKU — GISR", Owner = "HBKU", Description = "React / Drupal", Tech = ["React", "Drupal"], State = ProjectState.Active, Color = "#6B3FC4" },
            new Project { Id = Guid.NewGuid(), Name = "HBKU", Owner = "HBKU", Description = "React / Drupal", Tech = ["React", "Drupal"], State = ProjectState.Active, Color = "#0E7C86" },
            new Project { Id = Guid.NewGuid(), Name = "QF-360", Owner = "Rawas", Description = "React", Tech = ["React"], State = ProjectState.Active, Color = "#C2185B" },
            new Project { Id = Guid.NewGuid(), Name = "QF-TNS", Owner = "Ammar", Description = "React", Tech = ["React"], State = ProjectState.Active, Color = "#B8860B" },
            new Project { Id = Guid.NewGuid(), Name = "Mediacity", Owner = "Shahad", Description = "SEO improvement", Tech = ["SEO improvement"], State = ProjectState.Active, Color = "#3F51B5" },
            new Project { Id = Guid.NewGuid(), Name = "Thakira / QNL", Owner = "—", Description = "Style support", Tech = ["Style support"], State = ProjectState.Active, Color = "#00897B" },
            new Project { Id = Guid.NewGuid(), Name = "NPC AI Chatbot", Owner = "—", Description = "API / FE support", Tech = ["API / FE support"], State = ProjectState.Active, Color = "#8E24AA" },
            new Project { Id = Guid.NewGuid(), Name = "EC", Owner = "—", Description = "HTML / CSS pages", Tech = ["HTML / CSS pages"], State = ProjectState.Completed, Color = "#5D4037", CompletedOn = new DateOnly(2026, 8, 14) },
            new Project { Id = Guid.NewGuid(), Name = "QFFD", Owner = "Rida", Description = "Style support", Tech = ["Style support"], State = ProjectState.Backlog, Color = "#455A64" },
        };
        var pr = projects.ToDictionary(x => x.Name, x => x.Id);

        (string person, string project, string work, int alloc, string start, string end)[] rows =
        [
            ("p4", "HBKU", "Client side — long term", 100, "2024-01-01", "2027-01-01"),
            ("p5", "QF-TNS", "React build", 50, "2026-01-01", "2027-01-01"),
            ("p3", "QF-360", "Dashboard — client side", 100, "2026-01-01", "2027-01-01"),
            ("p1", "HBKU — GISR", "Client side", 100, "2026-06-21", "2026-08-21"),
            ("p0", "QU", "Bug fixes", 75, "2026-06-22", "2026-09-03"),
            ("p2", "QF-360", "Dashboard — client side", 100, "2026-07-05", "2026-08-05"),
            ("p6", "Multiversity", "API integration", 25, "2026-07-20", "2026-07-30"),
            ("p6", "Thakira / QNL", "Style support", 25, "2026-07-20", "2026-09-10"),
            ("p6", "Mediacity", "SEO support", 25, "2026-05-24", "2026-08-30"),
            ("p6", "NPC AI Chatbot", "API / FE support", 25, "2026-07-28", "2027-07-28"),
            ("p5", "EC", "New page — HTML/CSS", 50, "2026-08-12", "2026-08-14"),
            ("p2", "COM — Council of Ministers", "React / Next", 50, "2026-08-12", "2026-09-29"),
            ("p0", "Mediacity", "SEO and speed enhancement", 50, "2026-05-20", "2026-09-10"),
            ("p2", "HBKU — GISR", "React bug fixes", 50, "2026-08-24", "2026-09-24"),
            ("p6", "Multiversity", "React, style support", 100, "2026-07-20", "2026-08-28"),
        ];

        var assignments = rows.Select(r => new Assignment
        {
            Id = Guid.NewGuid(),
            PersonId = p[r.person],
            ProjectId = pr[r.project],
            Work = r.work,
            Alloc = r.alloc,
            Start = DateOnly.Parse(r.start),
            End = DateOnly.Parse(r.end)
        }).ToList();

        db.People.AddRange(people);
        db.Projects.AddRange(projects);
        db.Assignments.AddRange(assignments);
        await db.SaveChangesAsync(ct);
    }
}
