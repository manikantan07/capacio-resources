using DeliveryHub.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeliveryHub.Api;

/// <summary>Maps Application-layer exceptions to ProblemDetails responses.</summary>
public class ExceptionHandlingMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex) when (TryMapStatusCode(ex, out var statusCode))
        {
            context.Response.StatusCode = statusCode;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = statusCode,
                Title = ex.Message
            });
        }
    }

    private static bool TryMapStatusCode(Exception ex, out int statusCode)
    {
        statusCode = ex switch
        {
            PersonNotFoundException or ProjectNotFoundException or AssignmentNotFoundException => StatusCodes.Status404NotFound,
            DuplicatePersonNameException or DuplicateProjectNameException or PersonHasActiveAssignmentsException or ProjectNotTentativeException => StatusCodes.Status409Conflict,
            InvalidDateRangeException or InvalidDeadlineExtensionException or AssignmentCompletionException => StatusCodes.Status400BadRequest,
            InvalidCredentialsException => StatusCodes.Status401Unauthorized,
            _ => 0
        };
        return statusCode != 0;
    }
}
