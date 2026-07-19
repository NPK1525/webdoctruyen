using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController(MangaDbContext context) : ControllerBase
    {
        private static readonly string[] MangaReasons =
        [
            "Duplicate entry", "Incorrect or missing volume numbers", "Information to correct",
            "Missing cover art", "Other", "Troll entry", "Vandalism"
        ];

        private static readonly string[] ChapterReasons =
        [
            "Credit page in the middle of the chapter", "Duplicate upload from same user/group",
            "Extraneous political/race-baiting/offensive content", "Fake/Spam chapter", "Group lock evasion",
            "Images not loading", "Incorrect chapter number", "Incorrect group", "Incorrect or duplicate pages",
            "Incorrect or missing chapter title", "Incorrect or missing volume number", "Missing pages",
            "Naming rules broken", "Official release/Raw", "Other", "Pages out of order",
            "Released before raws released", "Uploaded on wrong manga", "Watermarked images"
        ];

        private readonly MangaDbContext _context = context;

        [HttpPost]
        [RequireAuth]
        public async Task<IActionResult> Create([FromBody] CreateReportDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;
            if (!Enum.TryParse<ReportTargetType>(dto.TargetType, true, out var targetType))
                return BadRequest(new { message = "Đối tượng báo cáo không hợp lệ." });
            if (dto.MangaId is null && dto.ChapterId is null || dto.MangaId is not null && dto.ChapterId is not null)
                return BadRequest(new { message = "Báo cáo phải có đúng một đối tượng." });
            if (targetType == ReportTargetType.Manga && dto.MangaId is null || targetType == ReportTargetType.Chapter && dto.ChapterId is null)
                return BadRequest(new { message = "Đối tượng không khớp với loại báo cáo." });

            var reasons = targetType == ReportTargetType.Manga ? MangaReasons : ChapterReasons;
            if (!reasons.Contains(dto.Reason ?? string.Empty, StringComparer.Ordinal))
                return BadRequest(new { message = "Lý do báo cáo không hợp lệ." });
            if (string.Equals(dto.Reason, "Other", StringComparison.Ordinal) && string.IsNullOrWhiteSpace(dto.Explanation))
                return BadRequest(new { message = "Vui lòng nhập giải thích cho lý do Other." });
            if (dto.Explanation?.Length > 1000)
                return BadRequest(new { message = "Giải thích không được vượt quá 1000 ký tự." });

            Manga? manga = null;
            Chapter? chapter = null;
            if (targetType == ReportTargetType.Manga)
                manga = await _context.Mangas.FirstOrDefaultAsync(m => m.Id == dto.MangaId!.Value);
            else
                chapter = await _context.Chapters.FirstOrDefaultAsync(c => c.Id == dto.ChapterId!.Value);
            if (manga is null && chapter is null)
                return NotFound(new { message = "Không tìm thấy đối tượng báo cáo." });

            var mangaId = targetType == ReportTargetType.Manga ? dto.MangaId : chapter!.MangaId;
            if (dto.MangaId is not null && chapter is not null && chapter.MangaId != dto.MangaId)
                return BadRequest(new { message = "Chương không thuộc truyện đã chọn." });

            var duplicate = await _context.Reports.AnyAsync(r =>
                r.ReporterId == userId && r.TargetType == targetType && r.MangaId == mangaId &&
                r.ChapterId == (targetType == ReportTargetType.Chapter ? dto.ChapterId : null) &&
                r.Reason == dto.Reason && r.Status == ReportStatus.Pending);
            if (duplicate)
                return Conflict(new { message = "Bạn đã gửi báo cáo này và đang chờ xử lý." });

            var report = new Report
            {
                ReporterId = userId,
                TargetType = targetType,
                MangaId = mangaId,
                ChapterId = targetType == ReportTargetType.Chapter ? dto.ChapterId : null,
                Reason = dto.Reason!.Trim(),
                Explanation = string.IsNullOrWhiteSpace(dto.Explanation) ? null : dto.Explanation.Trim()
            };
            _context.Reports.Add(report);
            await _context.SaveChangesAsync();
            return Ok(new { id = report.Id, status = report.Status.ToString() });
        }

        [HttpGet]
        [RequireAdmin]
        public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? targetType, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 10, 100);
            var query = _context.Reports.AsNoTracking()
                .Include(r => r.Reporter).Include(r => r.Manga).Include(r => r.Chapter).AsQueryable();
            if (Enum.TryParse<ReportStatus>(status, true, out var parsedStatus)) query = query.Where(r => r.Status == parsedStatus);
            if (Enum.TryParse<ReportTargetType>(targetType, true, out var parsedTarget)) query = query.Where(r => r.TargetType == parsedTarget);
            var totalItems = await query.CountAsync();
            var totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)pageSize));
            page = Math.Min(page, totalPages);
            var reports = await query.OrderByDescending(r => r.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).Select(r => new
            {
                r.Id, targetType = r.TargetType.ToString(), r.MangaId, r.ChapterId, r.Reason, r.Explanation,
                status = r.Status.ToString(), r.CreatedAt, reporter = r.Reporter.Username,
                mangaTitle = r.Manga != null ? r.Manga.Title : null,
                chapterTitle = r.Chapter != null ? r.Chapter.Title : null
            }).ToListAsync();
            return Ok(new { items = reports, page, pageSize, totalItems, totalPages });
        }

        [HttpGet("my")]
        [RequireAuth]
        public async Task<IActionResult> MyReports()
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;
            var reports = await _context.Reports.AsNoTracking().Where(r => r.ReporterId == userId)
                .Include(r => r.Manga).Include(r => r.Chapter).OrderByDescending(r => r.CreatedAt)
                .Select(r => new { r.Id, targetType = r.TargetType.ToString(), r.Reason, r.Explanation, status = r.Status.ToString(), r.CreatedAt, r.ResolvedAt, mangaId = r.MangaId, chapterId = r.ChapterId, mangaTitle = r.Manga != null ? r.Manga.Title : null, chapterTitle = r.Chapter != null ? r.Chapter.Title : null }).ToListAsync();
            return Ok(reports);
        }

        [HttpPatch("{id:int}")]
        [RequireAdmin]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateReportDto dto)
        {
            if (!Enum.TryParse<ReportStatus>(dto.Status, true, out var status) || status == ReportStatus.Pending)
                return BadRequest(new { message = "Trạng thái xử lý không hợp lệ." });
            var report = await _context.Reports.FindAsync(id);
            if (report is null) return NotFound(new { message = "Không tìm thấy báo cáo." });
            report.Status = status;
            report.ResolvedAt = DateTime.UtcNow;
            report.ResolvedByUserId = HttpContext.Session.GetInt32("UserId");
            report.AdminNote = string.IsNullOrWhiteSpace(dto.AdminNote) ? null : dto.AdminNote.Trim();
            await _context.SaveChangesAsync();
            return Ok(new { id = report.Id, status = report.Status.ToString() });
        }
    }

    public sealed class CreateReportDto
    {
        public string? TargetType { get; set; }
        public int? MangaId { get; set; }
        public int? ChapterId { get; set; }
        public string? Reason { get; set; }
        public string? Explanation { get; set; }
    }

    public sealed class UpdateReportDto
    {
        public string? Status { get; set; }
        public string? AdminNote { get; set; }
    }
}
