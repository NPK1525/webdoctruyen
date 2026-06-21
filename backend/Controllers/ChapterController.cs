using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChapterController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

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
