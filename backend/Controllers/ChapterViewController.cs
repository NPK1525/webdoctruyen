using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [Route("chapter")]
    public class ChapterViewController(MangaDbContext context, MangaDexService mangaDexService) : Controller
    {
        private readonly MangaDbContext _context = context;
        private readonly MangaDexService _mangaDexService = mangaDexService;

        // GET /chapter/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Read(int id)
        {
            var chapter = await _context.Chapters
                .Include(c => c.Pages)
                .Include(c => c.Manga)
                    .ThenInclude(m => m.MangaAuthors)
                    .ThenInclude(ma => ma.Author)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (chapter == null) return NotFound();

            if (chapter.Source == "MangaDex" && !string.IsNullOrWhiteSpace(chapter.ExternalId))
            {
                // MangaDex@Home chi nen lay khi doc chuong, khong luu URL anh vao database vi URL co the thay doi.
                var urls = await _mangaDexService.GetChapterPageUrlsAsync(chapter.ExternalId, cancellationToken: HttpContext.RequestAborted);
                chapter.Pages = urls.Select((url, index) => new Page
                {
                    ChapterId = chapter.Id,
                    PageNumber = index + 1,
                    ImageUrl = url
                }).ToList();
            }
            else
            {
                chapter.Pages = chapter.Pages.OrderBy(p => p.PageNumber).ToList();
            }

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
