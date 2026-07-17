using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChapterController(MangaDbContext context, MangaDexService mangaDexService) : ControllerBase
    {
        private readonly MangaDbContext _context = context;
        private readonly MangaDexService _mangaDexService = mangaDexService;

        // GET: api/chapter/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetChapter(int id)
        {
            var chapter = await _context.Chapters
                .Include(c => c.Pages)
                .Include(c => c.Manga)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (chapter == null)
            {
                return NotFound(new { message = "Chapter not found" });
            }

            if (chapter.Source == "MangaDex" && !string.IsNullOrWhiteSpace(chapter.ExternalId))
            {
                // Lay URL anh moi tu MangaDex@Home moi khi doc chuong MangaDex.
                var urls = await _mangaDexService.GetChapterPageUrlsAsync(chapter.ExternalId, cancellationToken: HttpContext.RequestAborted);
                chapter.Pages = urls.Select((url, index) => new Page
                {
                    ChapterId = chapter.Id,
                    PageNumber = index + 1,
                    ImageUrl = url
                }).ToList();
            }

            // Find next and previous chapters in this manga
            var siblings = await _context.Chapters
                .Where(c => c.MangaId == chapter.MangaId)
                .OrderBy(c => c.ChapterNumber)
                .ToListAsync();

            var currentIndex = siblings.FindIndex(c => c.Id == id);
            int? prevChapterId = currentIndex > 0 ? siblings[currentIndex - 1].Id : null;
            int? nextChapterId = currentIndex < siblings.Count - 1 ? siblings[currentIndex + 1].Id : null;

            var result = new
            {
                chapter.Id,
                chapter.MangaId,
                MangaTitle = chapter.Manga.Title,
                chapter.ChapterNumber,
                chapter.Title,
                chapter.UploadedAt,
                Pages = chapter.Pages
                    .OrderBy(p => p.PageNumber)
                    .Select(p => new { p.Id, p.PageNumber, p.ImageUrl })
                    .ToList(),
                PrevChapterId = prevChapterId,
                NextChapterId = nextChapterId
            };

            return Ok(result);
        }
    }
}
