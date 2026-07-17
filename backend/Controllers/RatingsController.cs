using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RatingsController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        [HttpGet]
        public async Task<IActionResult> GetRatings([FromQuery] int mangaId)
        {
            if (mangaId <= 0)
                return BadRequest(new { message = "MangaId không hợp lệ." });

            var ratings = await _context.Ratings
                .AsNoTracking()
                .Where(r => r.MangaId == mangaId)
                .ToListAsync();

            var average = ratings.Count > 0 ? (double)ratings.Sum(r => r.Score) / ratings.Count : 0;
            var count = ratings.Count;

            return Ok(new { average, count });
        }

        [HttpGet("my")]
        [RequireAuth]
        public async Task<IActionResult> GetMyRating([FromQuery] int mangaId)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            var rating = await _context.Ratings
                .AsNoTracking()
                .Where(r => r.UserId == userId && r.MangaId == mangaId)
                .FirstOrDefaultAsync();

            if (rating == null)
                return Ok(new { score = 0 });

            return Ok(new { score = rating.Score });
        }

        [HttpPost]
        [RequireAuth]
        public async Task<IActionResult> CreateOrUpdateRating([FromBody] CreateRatingDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            if (dto.Score < 1 || dto.Score > 10)
                return BadRequest(new { message = "Điểm đánh giá phải từ 1 đến 10." });

            var manga = await _context.Mangas.AnyAsync(m => m.Id == dto.MangaId);
            if (!manga)
                return BadRequest(new { message = "Truyện không tồn tại." });

            var existingRating = await _context.Ratings
                .FirstOrDefaultAsync(r => r.UserId == userId && r.MangaId == dto.MangaId);

            if (existingRating != null)
            {
                // Update existing
                existingRating.Score = dto.Score;
                existingRating.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã cập nhật đánh giá.", score = existingRating.Score });
            }
            else
            {
                // Create new
                var rating = new Rating
                {
                    UserId = userId,
                    MangaId = dto.MangaId,
                    Score = dto.Score,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Ratings.Add(rating);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã đánh giá.", score = rating.Score });
            }
        }

        [HttpDelete]
        [RequireAuth]
        public async Task<IActionResult> DeleteRating([FromQuery] int mangaId)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            var rating = await _context.Ratings
                .FirstOrDefaultAsync(r => r.UserId == userId && r.MangaId == mangaId);

            if (rating == null)
                return NotFound(new { message = "Không tìm thấy đánh giá." });

            _context.Ratings.Remove(rating);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xóa đánh giá." });
        }
    }

    public class CreateRatingDto
    {
        public int MangaId { get; set; }
        public int Score { get; set; }
    }
}
