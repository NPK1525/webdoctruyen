using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public sealed class MangaListSaveRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsPublic { get; set; }
    public List<int> MangaIds { get; set; } = [];
}

public static class MangaListValidation
{
    public static List<string> Validate(MangaListSaveRequest request)
    {
        var errors = new List<string>();
        var name = request.Name?.Trim() ?? string.Empty;
        var description = request.Description?.Trim() ?? string.Empty;

        if (name.Length == 0) errors.Add("List name is required.");
        if (name.Length > 200) errors.Add("List name cannot exceed 200 characters.");
        if (description.Length > 1000) errors.Add("Description cannot exceed 1000 characters.");
        if (request.MangaIds.Any(id => id <= 0)) errors.Add("Manga IDs must be positive.");
        if (request.MangaIds.Count != request.MangaIds.Distinct().Count())
            errors.Add("Duplicate manga IDs are not allowed.");

        return errors;
    }
}

public readonly record struct MangaListItemState(int MangaId, int Order);
public sealed record MangaListChanges(
    IReadOnlyList<int> AddedMangaIds,
    IReadOnlyList<int> RemovedMangaIds,
    IReadOnlyList<MangaListItemState> FinalItems);

public static class MangaListSynchronization
{
    public static MangaListChanges Calculate(
        IEnumerable<MangaListItemState> existing,
        IEnumerable<int> requestedIds)
    {
        var current = existing.ToList();
        var requested = requestedIds.ToList();
        var currentIds = current.Select(item => item.MangaId).ToHashSet();
        var requestedSet = requested.ToHashSet();

        return new MangaListChanges(
            requested.Where(id => !currentIds.Contains(id)).ToList(),
            current.Where(item => !requestedSet.Contains(item.MangaId)).Select(item => item.MangaId).ToList(),
            requested.Select((id, index) => new MangaListItemState(id, index + 1)).ToList());
    }
}

public sealed class MangaListRequestException(string message) : Exception(message);
public sealed class MangaListNotFoundException : Exception;
public sealed class MangaListForbiddenException : Exception;

public sealed class MangaListService(MangaDbContext context)
{
    private readonly MangaDbContext _context = context;

    public async Task<MangaList> CreateAsync(int userId, MangaListSaveRequest request)
    {
        await ValidateRequestAsync(request);
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var list = new MangaList
        {
            UserId = userId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            IsPublic = request.IsPublic,
            CreatedAt = DateTime.UtcNow,
            Items = request.MangaIds.Select((id, index) => new MangaListItem
            {
                MangaId = id,
                Order = index + 1,
                AddedAt = DateTime.UtcNow
            }).ToList()
        };
        _context.MangaLists.Add(list);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return list;
    }

    public async Task<MangaList> UpdateAsync(int listId, int userId, MangaListSaveRequest request)
    {
        var list = await _context.MangaLists.Include(item => item.Items)
            .FirstOrDefaultAsync(item => item.Id == listId)
            ?? throw new MangaListNotFoundException();
        if (list.UserId != userId) throw new MangaListForbiddenException();

        await ValidateRequestAsync(request);
        await using var transaction = await _context.Database.BeginTransactionAsync();
        list.Name = request.Name.Trim();
        list.Description = request.Description?.Trim() ?? string.Empty;
        list.IsPublic = request.IsPublic;

        var changes = MangaListSynchronization.Calculate(
            list.Items.Select(item => new MangaListItemState(item.MangaId, item.Order)),
            request.MangaIds);
        var removed = list.Items.Where(item => changes.RemovedMangaIds.Contains(item.MangaId)).ToList();
        _context.MangaListItems.RemoveRange(removed);
        foreach (var state in changes.FinalItems)
        {
            var item = list.Items.FirstOrDefault(existing => existing.MangaId == state.MangaId);
            if (item is null)
            {
                item = new MangaListItem
                {
                    ListId = list.Id,
                    MangaId = state.MangaId,
                    AddedAt = DateTime.UtcNow
                };
                _context.MangaListItems.Add(item);
            }
            item.Order = state.Order;
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return list;
    }

    private async Task ValidateRequestAsync(MangaListSaveRequest request)
    {
        var errors = MangaListValidation.Validate(request);
        if (errors.Count > 0) throw new MangaListRequestException(errors[0]);
        if (request.MangaIds.Count == 0) return;
        var existingCount = await _context.Mangas.CountAsync(manga => request.MangaIds.Contains(manga.Id));
        if (existingCount != request.MangaIds.Count)
            throw new MangaListRequestException("One or more manga titles no longer exist.");
    }
}
