using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LibraryController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        [HttpGet]
        [RequireAuth]
        public async Task<IActionResult> GetLibrary([FromQuery] string tab = "follows")
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            var query = _context.UserMangaLibraries
                .AsNoTracking()
                .Include(uml => uml.Manga)
                .Include(uml => uml.LastChapter)
                .Where(uml => uml.UserId == userId);

            if (tab == "history")
            {
                query = query.Where(uml => uml.LastChapterId != null)
                    .OrderByDescending(uml => uml.UpdatedAt);
            }
            else
            {
                query = query.OrderByDescending(uml => uml.FollowedAt);
            }

            var items = await query.Select(uml => new LibraryItemDto
            {
                MangaId = uml.MangaId,
                Title = uml.Manga.Title,
                CoverUrl = uml.Manga.CoverUrl,
                Type = uml.Manga.Type.ToString(),
                MangaStatus = uml.Manga.Status.ToString(),
                ReadingStatus = uml.Status.ToString(),
                LastChapterId = uml.LastChapterId,
                LastChapterNumber = uml.LastChapter != null ? uml.LastChapter.ChapterNumber : null,
                LastPageNumber = uml.LastPageNumber,
                FollowedAt = uml.FollowedAt,
                UpdatedAt = uml.UpdatedAt
            }).ToListAsync();

            return Ok(new { items });
        }

        [HttpGet("{mangaId}")]
        [RequireAuth]
        public async Task<IActionResult> GetEntry(int mangaId)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            var entry = await _context.UserMangaLibraries
                .AsNoTracking()
                .Include(uml => uml.LastChapter)
                .FirstOrDefaultAsync(uml => uml.UserId == userId && uml.MangaId == mangaId);

            if (entry == null)
                return Ok(new { isFollowing = false });

            return Ok(new
            {
                isFollowing = true,
                readingStatus = entry.Status.ToString(),
                lastChapterId = entry.LastChapterId,
                lastChapterNumber = entry.LastChapter?.ChapterNumber,
                lastPageNumber = entry.LastPageNumber,
                updatedAt = entry.UpdatedAt
            });
        }

        [HttpPost("follow")]
        [RequireAuth]
        public async Task<IActionResult> Follow([FromBody] FollowDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            if (!await _context.Mangas.AnyAsync(m => m.Id == dto.MangaId))
                return BadRequest(new { message = "Truyện không tồn tại." });

            var existing = await _context.UserMangaLibraries
                .FirstOrDefaultAsync(uml => uml.UserId == userId && uml.MangaId == dto.MangaId);

            if (existing != null)
                return Ok(new { message = "Đã theo dõi truyện này.", isFollowing = true });

            var status = dto.Status ?? ReadingStatus.Reading;
            var entry = new UserMangaLibrary
            {
                UserId = userId,
                MangaId = dto.MangaId,
                Status = status,
                FollowedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.UserMangaLibraries.Add(entry);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã thêm vào thư viện.", isFollowing = true });
        }

        [HttpDelete("{mangaId}")]
        [RequireAuth]
        public async Task<IActionResult> Unfollow(int mangaId)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            var entry = await _context.UserMangaLibraries
                .FirstOrDefaultAsync(uml => uml.UserId == userId && uml.MangaId == mangaId);

            if (entry == null)
                return Ok(new { message = "Chưa theo dõi truyện này.", isFollowing = false });

            _context.UserMangaLibraries.Remove(entry);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã bỏ theo dõi.", isFollowing = false });
        }

        [HttpPut("{mangaId}/status")]
        [RequireAuth]
        public async Task<IActionResult> UpdateStatus(int mangaId, [FromBody] UpdateStatusDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            var entry = await _context.UserMangaLibraries
                .FirstOrDefaultAsync(uml => uml.UserId == userId && uml.MangaId == mangaId);

            if (entry == null)
                return NotFound(new { message = "Chưa theo dõi truyện này." });

            entry.Status = dto.Status;
            entry.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật trạng thái thành công.", readingStatus = entry.Status.ToString() });
        }

        [HttpPut("progress")]
        [RequireAuth]
        public async Task<IActionResult> UpdateProgress([FromBody] UpdateProgressDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            var chapter = await _context.Chapters
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.ChapterId && c.MangaId == dto.MangaId);

            if (chapter == null)
                return BadRequest(new { message = "Chương không tồn tại." });

            var entry = await _context.UserMangaLibraries
                .FirstOrDefaultAsync(uml => uml.UserId == userId && uml.MangaId == dto.MangaId);

            if (entry == null)
            {
                return Ok(new
                {
                    message = "Progress is kept in reading history until this title is added to Library.",
                    isFollowing = false,
                    lastChapterId = dto.ChapterId,
                    lastChapterNumber = chapter.ChapterNumber,
                    lastPageNumber = dto.PageNumber
                });
            }

            entry.LastChapterId = dto.ChapterId;
            entry.LastPageNumber = dto.PageNumber;
            entry.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Đã lưu tiến độ đọc.",
                lastChapterId = entry.LastChapterId,
                lastChapterNumber = chapter.ChapterNumber,
                lastPageNumber = entry.LastPageNumber
            });
        }
    }

    public class LibraryItemDto
    {
        public int MangaId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string MangaStatus { get; set; } = string.Empty;
        public string ReadingStatus { get; set; } = string.Empty;
        public int? LastChapterId { get; set; }
        public double? LastChapterNumber { get; set; }
        public int LastPageNumber { get; set; }
        public DateTime FollowedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class FollowDto
    {
        public int MangaId { get; set; }
        public ReadingStatus? Status { get; set; }
    }

    public class UpdateStatusDto
    {
        public ReadingStatus Status { get; set; }
    }

    public class UpdateProgressDto
    {
        public int MangaId { get; set; }
        public int ChapterId { get; set; }
        public int PageNumber { get; set; }
    }
}
