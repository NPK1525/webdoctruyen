using MangaNPK.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers;

[Route("contribution")]
public class ContributionController(MangaDbContext context) : Controller
{
    private readonly MangaDbContext _context = context;

    [HttpGet("title/create")]
    public async Task<IActionResult> TitleCreate()
    {
        if (HttpContext.Session.GetInt32("UserId") == null)
            return RedirectToAction("Login", "Account", new { returnUrl = "/contribution/title/create" });

        ViewBag.Authors = await _context.Authors.AsNoTracking().OrderBy(a => a.Name).ToListAsync();
        ViewBag.Genres = await _context.Genres.AsNoTracking().OrderBy(g => g.Name).ToListAsync();
        ViewBag.Themes = await _context.Themes.AsNoTracking().OrderBy(t => t.Name).ToListAsync();
        return View();
    }
}
