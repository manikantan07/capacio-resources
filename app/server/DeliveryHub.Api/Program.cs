using System.Text;
using System.Text.Json.Serialization;
using DeliveryHub.Api;
using DeliveryHub.Application.Contracts;
using DeliveryHub.Application.Services;
using DeliveryHub.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
    {
        // Every endpoint requires a valid, signed-in caller by default — the "approved
        // login" requirement. Mutating actions additionally carry [Authorize(Roles =
        // "Owner")]; GETs just need any authenticated role (Owner or Viewer).
        options.Filters.Add(new AuthorizeFilter());
    })
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();

// Local dev and any real deployment use SQL Server (see docker-compose.yml). The hosted
// preview has no SQL Server of its own, so it opts into SQLite via one app setting
// (Database:Provider=Sqlite) instead — same schema, same seeding, zero extra Azure
// resource to provision for a throwaway preview environment.
var dbProvider = builder.Configuration["Database:Provider"];
builder.Services.AddDbContext<DeliveryHubDbContext>(options =>
{
    if (string.Equals(dbProvider, "Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        options.UseSqlite(builder.Configuration.GetConnectionString("DeliveryHub"));
    }
    else
    {
        options.UseSqlServer(builder.Configuration.GetConnectionString("DeliveryHub"));
    }
});
builder.Services.AddScoped<IDeliveryHubDbContext>(sp => sp.GetRequiredService<DeliveryHubDbContext>());

builder.Services.AddSingleton<IDateProvider, SystemDateProvider>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IActorProvider, HeaderActorProvider>();
builder.Services.AddScoped<IActivityLogger, ActivityLogger>();
builder.Services.AddScoped<PeopleService>();
builder.Services.AddScoped<ProjectsService>();
builder.Services.AddScoped<AssignmentsService>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<AuthService>();

// Auth: a real login (email + password, checked against the AppUsers table) issuing a
// signed JWT — see AuthController and AppUserSeeder. This is deliberately independent
// of the Microsoft Entra ID plan noted in the architecture doc (still pending a tenant
// ID); when that lands, only the token-issuing side changes, not the [Authorize]
// policies below or how the rest of the app consumes identity (ActorProvider).
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();

const string DevCorsPolicy = "DevCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://applabhtml.z6.web.core.windows.net")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // GET /openapi/v1.json — confirms the API surface

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<DeliveryHubDbContext>();
    if (string.Equals(dbProvider, "Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        // The SQLite migrations history was generated against SQL Server, so replaying it
        // here trips EF's pending-model-changes check for no real reason — this DB is
        // ephemeral (reseeded on every start anyway), so just create the schema fresh.
        await db.Database.EnsureCreatedAsync();
    }
    else
    {
        await db.Database.MigrateAsync();
    }
    await DbSeeder.SeedAsync(db);
    await AppUserSeeder.SeedAsync(db, app.Logger);
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors(DevCorsPolicy);
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
