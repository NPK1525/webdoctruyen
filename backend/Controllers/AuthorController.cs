using MangaNPK.Data;
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
            var authors = await _context.Authors
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
            return Ok(authors);
        }
    }
}
