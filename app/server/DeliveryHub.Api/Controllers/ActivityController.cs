using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DeliveryHub.Api.Controllers;

[ApiController]
[Route("api/activity")]
public class ActivityController(ActivityService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ActivityHistoryPage>> GetHistory(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        Ok(await service.GetHistoryAsync(from, to, page, pageSize, ct));

    [HttpPost("undo")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<UndoActivitiesResult>> Undo(UndoActivitiesRequest request, CancellationToken ct) =>
        Ok(await service.UndoAsync(request.ActivityIds, ct));
}
