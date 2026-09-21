using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeliveryHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentDeadlineTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Backlogged",
                table: "Assignments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ExtensionReason",
                table: "Assignments",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "OriginalDeadline",
                table: "Assignments",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Backlogged",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "ExtensionReason",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "OriginalDeadline",
                table: "Assignments");
        }
    }
}
