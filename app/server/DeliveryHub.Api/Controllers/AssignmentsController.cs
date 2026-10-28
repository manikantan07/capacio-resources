using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DeliveryHub.Api.Controllers;

[ApiController]
[Route("api/assignments")]
public class AssignmentsController(AssignmentsService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AssignmentDto>>> GetAll(CancellationToken ct) =>
        Ok(await service.GetAllAsync(ct));

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<AssignmentDto>> Create(CreateAssignmentRequest request, CancellationToken ct) =>
        Ok(await service.CreateAsync(request, ct));

    [HttpPut("{id:guid}/alloc")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<AssignmentDto>> UpdateAlloc(Guid id, UpdateAllocRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAllocAsync(id, request, ct));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<AssignmentDto>> Update(Guid id, UpdateAssignmentRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/reassign")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<AssignmentDto>> Reassign(Guid id, ReassignRequest request, CancellationToken ct) =>
        Ok(await service.ReassignAsync(id, request, ct));

    [HttpPost("{id:guid}/complete")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<AssignmentDto>> Complete(Guid id, CancellationToken ct) =>
        Ok(await service.CompleteAsync(id, ct));

    [HttpGet("{id:guid}/move-preview")]
    public async Task<ActionResult<List<MovePreviewDto>>> MovePreview(Guid id, CancellationToken ct) =>
        Ok(await service.GetMovePreviewAsync(id, ct));

    [HttpGet("skill-match")]
    public async Task<ActionResult<SkillMatchDto>> SkillMatch([FromQuery] Guid personId, [FromQuery] Guid projectId, CancellationToken ct) =>
        Ok(await service.GetSkillMatchAsync(personId, projectId, ct));
}
