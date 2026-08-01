using MangaNPK.Data;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthorController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        [HttpGet]
        public async Task<IActionResult> GetAuthors()
        {
            var authorRows = await _context.Authors
                .OrderBy(a => a.Name)
                .Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Biography,
                    Roles = a.MangaAuthors
                        .Select(link => link.Role)
                        .Distinct()
                        .ToList()
                })
                .ToListAsync();
            var authors = authorRows.Select(a => new
            {
                a.Id,
                a.Name,
                a.Biography,
                Roles = a.Roles
                    .Select(ContributorRoleClassifier.Normalize)
                    .Distinct()
                    .ToList()
            }).ToList();
            return Ok(authors);
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetAuthorsPage(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Authors.AsNoTracking().AsQueryable();
            var term = search?.Trim();
            if (!string.IsNullOrWhiteSpace(term))
                query = query.Where(author => author.Name.Contains(term));

            var totalItems = await query.CountAsync();
            var totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)pageSize));
            page = Math.Min(page, totalPages);

            var items = await query
                .OrderBy(a => a.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(author => new
                {
                    author.Id,
                    author.Name,
                    author.Biography,
                    Roles = author.MangaAuthors
                        .Select(link => link.Role)
                        .Distinct()
                        .ToList()
                })
                .ToListAsync();

            var authors = items.Select(author => new
            {
                author.Id,
                author.Name,
                author.Biography,
                Roles = author.Roles
                    .Select(ContributorRoleClassifier.Normalize)
                    .Distinct()
                    .ToList()
            }).ToList();

            return Ok(new { items = authors, page, pageSize, totalItems, totalPages });
        }
    }
}
