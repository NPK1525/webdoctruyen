using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers;

[ApiController]
[Route("api/title-submissions")]
public class TitleSubmissionController(
    MangaDbContext context,
    TitleSubmissionService submissionService) : ControllerBase
{
    private readonly MangaDbContext _context = context;
    private readonly TitleSubmissionService _submissionService = submissionService;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TitleSubmissionPayload payload, CancellationToken cancellationToken)
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập để gửi truyện." });

        try
        {
            var isAdmin = string.Equals(HttpContext.Session.GetString("Role"), "Admin", StringComparison.OrdinalIgnoreCase);
            var result = await _submissionService.SubmitAsync(payload, userId.Value, isAdmin, cancellationToken);
            return Ok(new
            {
                message = isAdmin ? "Đã đăng truyện thành công." : "Đã gửi truyện chờ Admin duyệt.",
                result.Kind,
                result.DraftId,
                result.MangaId
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken cancellationToken)
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập." });

        var draft = await _context.TitleDrafts
            .AsNoTracking()
            .Include(d => d.Authors)
            .FirstOrDefaultAsync(d => d.Id == id && d.CreatedByUserId == userId.Value, cancellationToken);
        return draft == null ? NotFound() : Ok(draft);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TitleSubmissionPayload payload, CancellationToken cancellationToken)
    {
        var userId = HttpContext.Session.GetInt32("UserId");
        if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập." });

        var draft = await _context.TitleDrafts
            .Include(d => d.Authors)
            .FirstOrDefaultAsync(d => d.Id == id && d.CreatedByUserId == userId.Value, cancellationToken);
        if (draft == null) return NotFound();
        if (draft.ReviewStatus == TitleDraftReviewStatus.Pending)
            return Conflict(new { message = "Bản nháp đang chờ duyệt." });
        if (draft.ReviewStatus == TitleDraftReviewStatus.Approved)
            return Conflict(new { message = "Bản nháp đã duyệt không thể sửa." });

        var error = TitleSubmissionValidation.Validate(payload, requireCover: true);
        if (error != null) return BadRequest(new { message = error });

        draft.Title = payload.Title.Trim();
        draft.Description = payload.Description.Trim();
        draft.CoverUrl = payload.CoverUrl.Trim();
        draft.Type = payload.Type;
        draft.Status = payload.Status;
        draft.Demographic = payload.Demographic;
        draft.Format = payload.Format;
        draft.ContentWarnings = string.Join(',', MangaContentWarning.Normalize(payload.ContentWarnings));
        draft.GenreIdsJson = System.Text.Json.JsonSerializer.Serialize(payload.GenreIds.Distinct().ToList());
        draft.ThemeIdsJson = System.Text.Json.JsonSerializer.Serialize(payload.ThemeIds.Distinct().ToList());
        draft.UpdatedAt = DateTime.UtcNow;
        draft.ReviewStatus = TitleDraftReviewStatus.Pending;
        draft.RejectionReason = string.Empty;
        _context.TitleDraftAuthors.RemoveRange(draft.Authors);
        draft.Authors = payload.Authors.Select(a => new TitleDraftAuthor
        {
            AuthorId = a.AuthorId,
            ProposedName = a.Name.Trim(),
            Role = a.Role.Trim()
        }).ToList();
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Đã gửi lại truyện chờ duyệt.", draftId = id });
    }
}
