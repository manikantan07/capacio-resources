using System.Text.Json;
using DeliveryHub.Application.Contracts;
using DeliveryHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeliveryHub.Infrastructure;

public class DeliveryHubDbContext(DbContextOptions<DeliveryHubDbContext> options)
    : DbContext(options), IDeliveryHubDbContext
{
    public DbSet<Person> People => Set<Person>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var stringListComparer = new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
            (a, b) => (a ?? new()).SequenceEqual(b ?? new()),
            v => v.Aggregate(0, (hash, s) => HashCode.Combine(hash, s.GetHashCode())),
            v => v.ToList());

        modelBuilder.Entity<Person>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(p => p.Name).IsUnique();
            entity.Property(p => p.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(p => p.Skills)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                    v => JsonSerializer.Deserialize<List<string>>(v, JsonSerializerOptions.Default) ?? new())
                .Metadata.SetValueComparer(stringListComparer);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(p => p.Name).IsUnique();
            entity.Property(p => p.State).HasConversion<string>().HasMaxLength(20);
            entity.Property(p => p.Tech)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                    v => JsonSerializer.Deserialize<List<string>>(v, JsonSerializerOptions.Default) ?? new())
                .Metadata.SetValueComparer(stringListComparer);
        });

        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Work).HasMaxLength(500);
            entity.Property(a => a.DeadlineExtensions)
                .HasDefaultValueSql("'[]'")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                    v => JsonSerializer.Deserialize<List<DeadlineExtension>>(v, JsonSerializerOptions.Default) ?? new())
                .Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<DeadlineExtension>>(
                    (a, b) => (a ?? new()).SequenceEqual(b ?? new()),
                    v => v.Aggregate(0, (hash, extension) => HashCode.Combine(hash, extension.GetHashCode())),
                    v => v.ToList()));
            entity.HasIndex(a => a.PersonId); // no FK constraint by design — see Assignment.cs
            entity.HasOne(a => a.Project)
                .WithMany(p => p.Assignments)
                .HasForeignKey(a => a.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        var entryListComparer = new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<ActivityEntry>>(
            (a, b) => JsonSerializer.Serialize(a, JsonSerializerOptions.Default) == JsonSerializer.Serialize(b, JsonSerializerOptions.Default),
            v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default).GetHashCode(),
            v => JsonSerializer.Deserialize<List<ActivityEntry>>(JsonSerializer.Serialize(v, JsonSerializerOptions.Default), JsonSerializerOptions.Default) ?? new());

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.ActorEmail).HasMaxLength(256);
            entity.Property(a => a.Summary).HasMaxLength(1000);
            entity.Property(a => a.ActionType).HasConversion<string>().HasMaxLength(30);
            entity.Property(a => a.Entries)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                    v => JsonSerializer.Deserialize<List<ActivityEntry>>(v, JsonSerializerOptions.Default) ?? new())
                .Metadata.SetValueComparer(entryListComparer);
            entity.HasIndex(a => a.OccurredAt);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.DisplayName).HasMaxLength(200);
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        });
    }
}
