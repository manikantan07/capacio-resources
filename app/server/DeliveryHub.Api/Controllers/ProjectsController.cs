using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DeliveryHub.Api.Controllers;

[ApiController]
[Route("api/projects")]
public class ProjectsController(ProjectsService service) : ControllerBase
{
    // Rule 8: live matrix excludes completed projects.
    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetLive(CancellationToken ct) =>
        Ok(await service.GetLiveMatrixAsync(ct));

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<ProjectDto>> Create(CreateProjectRequest request, CancellationToken ct) =>
        Ok(await service.CreateAsync(request, ct));

    [HttpPost("{id:guid}/complete")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<MarkCompleteResult>> MarkComplete(Guid id, CancellationToken ct) =>
        Ok(await service.MarkCompleteAsync(id, ct));

    [HttpPost("{id:guid}/reopen")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Reopen(Guid id, CancellationToken ct)
    {
        await service.ReopenAsync(id, ct);
        return NoContent();
    }

    [HttpGet("completed")]
    public async Task<ActionResult<List<CompletedProjectDto>>> GetCompleted(CancellationToken ct) =>
        Ok(await service.GetCompletedAsync(ct));

    [HttpGet("completed/stats")]
    public async Task<ActionResult<CompletedStatsDto>> GetCompletedStats(CancellationToken ct) =>
        Ok(await service.GetCompletedStatsAsync(ct));
}
