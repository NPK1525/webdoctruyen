using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [Route("chapter")]
    public class ChapterViewController(MangaDbContext context) : Controller
    {
        private readonly MangaDbContext _context = context;

        // GET /chapter/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Read(int id)
        {
            var chapter = await _context.Chapters
                .Include(c => c.Pages)
                .Include(c => c.Manga)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (chapter == null) return NotFound();

            chapter.Pages = chapter.Pages.OrderBy(p => p.PageNumber).ToList();

            var siblings = await _context.Chapters
                .Where(c => c.MangaId == chapter.MangaId)
                .OrderBy(c => c.ChapterNumber)
                .ToListAsync();

            var idx = siblings.FindIndex(c => c.Id == id);
            ViewBag.PrevChapterId = idx > 0 ? siblings[idx - 1].Id : (int?)null;
            ViewBag.NextChapterId = idx < siblings.Count - 1 ? siblings[idx + 1].Id : (int?)null;
            ViewBag.AllChapters = siblings;

            return View(chapter);
        }
    }
}
