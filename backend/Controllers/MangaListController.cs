using MangaNPK.Data;
using MangaNPK.Filters;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MangaListController(MangaDbContext context, MangaListService mangaListService) : ControllerBase
{
    private readonly MangaDbContext _context = context;
    private readonly MangaListService _mangaListService = mangaListService;

    [HttpGet]
    [RequireAuth]
    public async Task<IActionResult> GetMyLists()
    {
        var userId = GetUserId();
        var lists = await _context.MangaLists
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new ListDto
            {
                Id = l.Id,
                Name = l.Name,
                Description = l.Description,
                IsPublic = l.IsPublic,
                CreatedAt = l.CreatedAt,
                ItemCount = l.Items.Count,
                OwnerName = l.User.Username,
                PreviewItems = l.Items
                    .OrderBy(i => i.Order)
                    .Take(6)
                    .Select(i => new ListItemDto
                    {
                        MangaId = i.MangaId,
                        Title = i.Manga.Title,
                        CoverUrl = i.Manga.CoverUrl,
                        Type = i.Manga.Type.ToString(),
                        Order = i.Order,
                        AddedAt = i.AddedAt
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(lists);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetList(int id)
    {
        var list = await _context.MangaLists
            .Include(l => l.Items.OrderBy(i => i.Order))
                .ThenInclude(i => i.Manga)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (list == null)
            return NotFound(new { message = "List not found" });

        if (!list.IsPublic)
        {
            var userId = GetUserId();
            if (userId == null || userId.Value != list.UserId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "This list is private" });
        }

        return Ok(new ListDetailDto
        {
            Id = list.Id,
            Name = list.Name,
            Description = list.Description,
            IsPublic = list.IsPublic,
            CreatedAt = list.CreatedAt,
            UserId = list.UserId,
            Items = list.Items.Select(i => new ListItemDto
            {
                MangaId = i.MangaId,
                Title = i.Manga.Title,
                CoverUrl = i.Manga.CoverUrl,
                Type = i.Manga.Type.ToString(),
                Order = i.Order,
                AddedAt = i.AddedAt
            }).ToList()
        });
    }

    [HttpPost]
    [RequireAuth]
    public async Task<IActionResult> CreateList([FromBody] MangaListSaveRequest request)
    {
        try
        {
            var list = await _mangaListService.CreateAsync(GetUserId()!.Value, request);
            return CreatedAtAction(nameof(GetList), new { id = list.Id }, new ListDto
            {
                Id = list.Id,
                Name = list.Name,
                Description = list.Description,
                IsPublic = list.IsPublic,
                CreatedAt = list.CreatedAt,
                ItemCount = list.Items.Count
            });
        }
        catch (MangaListRequestException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [RequireAuth]
    public async Task<IActionResult> UpdateList(int id, [FromBody] MangaListSaveRequest request)
    {
        try
        {
            var list = await _mangaListService.UpdateAsync(id, GetUserId()!.Value, request);
            return Ok(new { id = list.Id, message = "List updated" });
        }
        catch (MangaListNotFoundException)
        {
            return NotFound(new { message = "List not found" });
        }
        catch (MangaListForbiddenException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Not your list" });
        }
        catch (MangaListRequestException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [RequireAuth]
    public async Task<IActionResult> DeleteList(int id)
    {
        var list = await _context.MangaLists
            .Include(l => l.Items)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (list == null)
            return NotFound(new { message = "List not found" });

        var userId = GetUserId()!.Value;
        if (list.UserId != userId)
            return Unauthorized(new { message = "Not your list" });

        _context.MangaListItems.RemoveRange(list.Items);
        _context.MangaLists.Remove(list);
        await _context.SaveChangesAsync();

        return Ok(new { message = "List deleted" });
    }

    [HttpPost("{id}/items")]
    [RequireAuth]
    public async Task<IActionResult> AddItem(int id, [FromBody] AddItemDto dto)
    {
        var list = await _context.MangaLists
            .Include(l => l.Items)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (list == null)
            return NotFound(new { message = "List not found" });

        var userId = GetUserId()!.Value;
        if (list.UserId != userId)
            return Unauthorized(new { message = "Not your list" });

        var manga = await _context.Mangas.FindAsync(dto.MangaId);
        if (manga == null)
            return BadRequest(new { message = "Manga not found" });

        if (list.Items.Any(i => i.MangaId == dto.MangaId))
            return BadRequest(new { message = "Manga already in list" });

        var maxOrder = list.Items.Count > 0 ? list.Items.Max(i => i.Order) : 0;

        var item = new MangaListItem
        {
            ListId = id,
            MangaId = dto.MangaId,
            Order = maxOrder + 1,
            AddedAt = DateTime.UtcNow
        };

        _context.MangaListItems.Add(item);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Manga added to list" });
    }

    [HttpDelete("{listId}/items/{mangaId}")]
    [RequireAuth]
    public async Task<IActionResult> RemoveItem(int listId, int mangaId)
    {
        var item = await _context.MangaListItems
            .Include(i => i.List)
            .FirstOrDefaultAsync(i => i.ListId == listId && i.MangaId == mangaId);

        if (item == null)
            return NotFound(new { message = "Item not found" });

        var userId = GetUserId()!.Value;
        if (item.List.UserId != userId)
            return Unauthorized(new { message = "Not your list" });

        _context.MangaListItems.Remove(item);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Manga removed from list" });
    }

    [HttpGet("{listId}/items/{mangaId}")]
    [RequireAuth]
    public async Task<IActionResult> CheckItem(int listId, int mangaId)
    {
        var userId = GetUserId()!.Value;
        var ownsList = await _context.MangaLists.AnyAsync(list => list.Id == listId && list.UserId == userId);
        if (!ownsList)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Not your list" });

        var item = await _context.MangaListItems
            .AnyAsync(i => i.ListId == listId && i.MangaId == mangaId);

        return Ok(new { inList = item });
    }

    [HttpGet("check/{mangaId}")]
    [RequireAuth]
    public async Task<IActionResult> CheckMangaInUserLists(int mangaId)
    {
        var userId = GetUserId()!.Value;
        var listIds = await _context.MangaListItems
            .Where(i => i.MangaId == mangaId && i.List.UserId == userId)
            .Select(i => i.ListId)
            .ToListAsync();

        return Ok(listIds);
    }

    private int? GetUserId()
    {
        var val = HttpContext.Session.GetInt32("UserId");
        return val;
    }
}

// DTOs
public class ListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; }
    public int ItemCount { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public List<ListItemDto> PreviewItems { get; set; } = [];
}

public class ListDetailDto : ListDto
{
    public int UserId { get; set; }
    public List<ListItemDto> Items { get; set; } = [];
}

public class ListItemDto
{
    public int MangaId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CoverUrl { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Order { get; set; }
    public DateTime AddedAt { get; set; }
}

public class AddItemDto
{
    public int MangaId { get; set; }
}
