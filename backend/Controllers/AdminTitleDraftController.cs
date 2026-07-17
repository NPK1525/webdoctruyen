using MangaNPK.Contracts.Admin;
using MangaNPK.Filters;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [RequireAdmin]
    public class AdminTitleDraftController(TitleDraftAdminService service) : ControllerBase
    {
        private readonly TitleDraftAdminService _service = service;

        [HttpGet("title-drafts")]
        public async Task<IActionResult> GetTitleDrafts() => Ok(await _service.GetAllAsync(HttpContext.RequestAborted));

        [HttpGet("title-drafts/{id}")]
        public async Task<IActionResult> GetTitleDraft(int id) => ToResult(await _service.GetAsync(id, HttpContext.RequestAborted));

        [HttpPost("title-drafts")]
        public async Task<IActionResult> CreateTitleDraft([FromBody] SaveTitleDraftDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return Unauthorized(new { message = "Can dang nhap de tao ban nhap." });
            return ToResult(await _service.CreateAsync(dto, userId.Value, HttpContext.RequestAborted), "draftId");
        }

        [HttpPut("title-drafts/{id}")]
        public async Task<IActionResult> UpdateTitleDraft(int id, [FromBody] SaveTitleDraftDto dto)
            => ToResult(await _service.UpdateAsync(id, dto, HttpContext.RequestAborted), "draftId");

        [HttpPost("title-drafts/{id}/approve")]
        public async Task<IActionResult> ApproveTitleDraft(int id)
        {
            var reviewerId = HttpContext.Session.GetInt32("UserId");
            if (reviewerId == null) return Unauthorized(new { message = "Can dang nhap de duyet ban nhap." });
            return ToResult(await _service.ApproveAsync(id, reviewerId.Value, HttpContext.RequestAborted), "mangaId");
        }

        [HttpPost("title-drafts/{id}/reject")]
        public async Task<IActionResult> RejectTitleDraft(int id, [FromBody] RejectTitleDraftDto dto)
        {
            var reviewerId = HttpContext.Session.GetInt32("UserId");
            if (reviewerId == null) return Unauthorized(new { message = "Can dang nhap de tu choi ban nhap." });
            return ToResult(await _service.RejectAsync(id, dto.Reason, reviewerId.Value, HttpContext.RequestAborted));
        }

        private IActionResult ToResult(TitleDraftAdminResult result, string? idName = null)
        {
            if (result.Status == TitleDraftAdminStatus.NotFound) return NotFound(new { message = result.Message });
            if (result.Status == TitleDraftAdminStatus.BadRequest) return BadRequest(new { message = result.Message });
            if (result.Status == TitleDraftAdminStatus.ServerError) return StatusCode(500, new { message = result.Message, error = result.Error });
            if (result.Data != null) return Ok(result.Data);
            return idName == "draftId" ? Ok(new { message = result.Message, draftId = result.EntityId })
                : idName == "mangaId" ? Ok(new { message = result.Message, mangaId = result.EntityId })
                : Ok(new { message = result.Message });
        }
    }
}
