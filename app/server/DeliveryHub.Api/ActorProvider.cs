using System.Security.Claims;
using DeliveryHub.Application.Contracts;

namespace DeliveryHub.Api;

/// <summary>Who is making the current request — read from the validated JWT's email claim.</summary>
public class HeaderActorProvider(IHttpContextAccessor httpContextAccessor) : IActorProvider
{
    public string CurrentActorEmail =>
        httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email) ?? "unknown";
}
