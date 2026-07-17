using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentsController(MangaDbContext context) : ControllerBase
    {
        private readonly MangaDbContext _context = context;

        [HttpGet]
        public async Task<IActionResult> GetComments([FromQuery] int? mangaId, [FromQuery] int? chapterId)
        {
            if (!mangaId.HasValue && !chapterId.HasValue)
                return BadRequest(new { message = "Cần cung cấp mangaId hoặc chapterId." });

            var query = _context.Comments
                .AsNoTracking()
                .Include(c => c.User)
                .AsQueryable();

            if (mangaId.HasValue)
                query = query.Where(c => c.MangaId == mangaId.Value);

            if (chapterId.HasValue)
                query = query.Where(c => c.ChapterId == chapterId.Value);

            var comments = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new CommentDto
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Username = c.User.Username,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync();

            return Ok(new { comments });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetComment(int id)
        {
            var comment = await _context.Comments
                .AsNoTracking()
                .Include(c => c.User)
                .Where(c => c.Id == id)
                .Select(c => new CommentDto
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Username = c.User.Username,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (comment == null)
                return NotFound(new { message = "Không tìm thấy bình luận." });

            return Ok(comment);
        }

        [HttpPost]
        [RequireAuth]
        public async Task<IActionResult> CreateComment([FromBody] CreateCommentDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest(new { message = "Nội dung bình luận không được trống." });

            if (!dto.MangaId.HasValue && !dto.ChapterId.HasValue)
                return BadRequest(new { message = "Cần cung cấp mangaId hoặc chapterId." });

            if (dto.MangaId.HasValue && !await _context.Mangas.AnyAsync(m => m.Id == dto.MangaId.Value))
                return BadRequest(new { message = "Truyện không tồn tại." });

            if (dto.ChapterId.HasValue && !await _context.Chapters.AnyAsync(c => c.Id == dto.ChapterId.Value))
                return BadRequest(new { message = "Chương không tồn tại." });

            var comment = new Comment
            {
                UserId = userId,
                MangaId = dto.MangaId,
                ChapterId = dto.ChapterId,
                Content = dto.Content.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);

            return Ok(new CommentDto
            {
                Id = comment.Id,
                UserId = comment.UserId,
                Username = user?.Username ?? "Unknown",
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt
            });
        }

        [HttpPut("{id}")]
        [RequireAuth]
        public async Task<IActionResult> UpdateComment(int id, [FromBody] UpdateCommentDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;

            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest(new { message = "Nội dung bình luận không được trống." });

            var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == id);
            if (comment == null)
                return NotFound(new { message = "Không tìm thấy bình luận." });

            if (comment.UserId != userId)
                return StatusCode(403, new { message = "Bạn không có quyền sửa bình luận này." });

            comment.Content = dto.Content.Trim();
            comment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);

            return Ok(new CommentDto
            {
                Id = comment.Id,
                UserId = comment.UserId,
                Username = user?.Username ?? "Unknown",
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt
            });
        }

        [HttpDelete("{id}")]
        [RequireAuth]
        public async Task<IActionResult> DeleteComment(int id)
        {
            var userId = HttpContext.Session.GetInt32("UserId")!.Value;
            var userRole = HttpContext.Session.GetString("Role");

            var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == id);
            if (comment == null)
                return NotFound(new { message = "Không tìm thấy bình luận." });

            if (comment.UserId != userId && userRole != "Admin")
                return StatusCode(403, new { message = "Bạn không có quyền xóa bình luận này." });

            _context.Comments.Remove(comment);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xóa bình luận." });
        }
    }

    public class CommentDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateCommentDto
    {
        public int? MangaId { get; set; }
        public int? ChapterId { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    public class UpdateCommentDto
    {
        public string Content { get; set; } = string.Empty;
    }
}
