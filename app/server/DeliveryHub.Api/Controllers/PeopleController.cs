using DeliveryHub.Application.Dtos;
using DeliveryHub.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DeliveryHub.Api.Controllers;

[ApiController]
[Route("api/people")]
public class PeopleController(PeopleService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PersonDto>>> GetAll(CancellationToken ct) =>
        Ok(await service.GetAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PersonDto>> GetById(Guid id, CancellationToken ct) =>
        Ok(await service.GetByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<PersonDto>> Create(CreatePersonRequest request, CancellationToken ct)
    {
        var created = await service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<PersonDto>> Update(Guid id, UpdatePersonRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}
