using MangaNPK.Contracts.Admin;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public sealed record ChapterEditResult(
    int Id, int MangaId, string Source, double ChapterNumber, string Title,
    IReadOnlyList<ChapterPageResult> Pages);

public sealed record ChapterPageResult(int Id, int PageNumber, string ImageUrl);

public sealed record ChapterListItemResult(int Id, double ChapterNumber, string Title, DateTime UploadedAt);

public sealed record ChapterListPageResult(
    IReadOnlyList<ChapterListItemResult> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public enum ChapterOperationStatus { Success, NotFound, BadRequest, Conflict, ServerError }

public sealed record ChapterOperationResult(
    ChapterOperationStatus Status, string Message, int? ChapterId = null, string? Error = null);

public sealed class ChapterAdminService(MangaDbContext context)
{
    private readonly MangaDbContext _context = context;

    public async Task<ChapterListPageResult?> GetPageAsync(
        int mangaId, string? search, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        if (!await _context.Mangas.AsNoTracking().AnyAsync(item => item.Id == mangaId, cancellationToken))
            return null;

        var query = _context.Chapters.AsNoTracking().Where(item => item.MangaId == mangaId);
        var term = search?.Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            if (double.TryParse(term, out var chapterNumber))
                query = query.Where(item => item.Title.Contains(term) || item.ChapterNumber == chapterNumber);
            else
                query = query.Where(item => item.Title.Contains(term));
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)pageSize));
        page = Math.Min(page, totalPages);
        var items = await query.OrderByDescending(item => item.ChapterNumber)
            .ThenByDescending(item => item.UploadedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new ChapterListItemResult(item.Id, item.ChapterNumber, item.Title, item.UploadedAt))
            .ToListAsync(cancellationToken);

        return new ChapterListPageResult(items, page, pageSize, totalItems, totalPages);
    }

    public async Task<ChapterEditResult?> GetForEditingAsync(int id, CancellationToken cancellationToken = default)
    {
        var chapter = await _context.Chapters.AsNoTracking().Include(item => item.Pages)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return chapter == null
            ? null
            : new ChapterEditResult(chapter.Id, chapter.MangaId, chapter.Source, chapter.ChapterNumber,
                chapter.Title, chapter.Pages.OrderBy(page => page.PageNumber)
                    .Select(page => new ChapterPageResult(page.Id, page.PageNumber, page.ImageUrl)).ToList());
    }

    public async Task<ChapterOperationResult> UpdateAsync(int id, UpdateChapterDto dto, CancellationToken cancellationToken = default)
    {
        var chapter = await _context.Chapters.Include(item => item.Pages)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (chapter == null) return new(ChapterOperationStatus.NotFound, "Không tìm thấy chapter.");
        if (dto.ChapterNumber < 0) return new(ChapterOperationStatus.BadRequest, "Số chapter không hợp lệ.");

        var duplicate = await _context.Chapters.AnyAsync(item => item.Id != id && item.MangaId == chapter.MangaId
            && item.Source == "Local" && item.ChapterNumber == dto.ChapterNumber, cancellationToken);
        if (chapter.Source == "Local" && duplicate)
            return new(ChapterOperationStatus.Conflict, "Số chapter này đã tồn tại trong truyện.");
        if (chapter.Source == "MangaDex" && dto.PageUrls != null)
            return new(ChapterOperationStatus.BadRequest, "Ảnh chapter MangaDex được lấy tự động và không thể sửa tại đây.");

        IReadOnlyList<string>? normalizedUrls = null;
        if (chapter.Source == "Local")
        {
            var parsed = ChapterUploadValidator.ParsePageUrls(string.Join('\n', dto.PageUrls ?? []));
            if (parsed.Error != null) return new(ChapterOperationStatus.BadRequest, parsed.Error);
            if (parsed.Urls.Count == 0) return new(ChapterOperationStatus.BadRequest, "Chapter phải có ít nhất một trang.");
            normalizedUrls = parsed.Urls;
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            chapter.ChapterNumber = dto.ChapterNumber;
            chapter.Title = string.IsNullOrWhiteSpace(dto.Title) ? $"Chương {dto.ChapterNumber}" : dto.Title.Trim();
            if (normalizedUrls != null)
            {
                _context.Pages.RemoveRange(chapter.Pages);
                ChapterUpdateService.ApplyLocalPages(chapter, normalizedUrls);
            }
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new(ChapterOperationStatus.Success, "Đã cập nhật chapter.", chapter.Id);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            return new(ChapterOperationStatus.ServerError, "Không thể cập nhật chapter. Dữ liệu cũ được giữ nguyên.");
        }
    }

    public async Task<ChapterOperationResult> CreateAsync(CreateChapterDto dto, CancellationToken cancellationToken = default)
    {
        if (await _context.Mangas.FindAsync([dto.MangaId], cancellationToken) == null)
            return new(ChapterOperationStatus.BadRequest, "Manga not found");

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var chapter = new Chapter { MangaId = dto.MangaId, ChapterNumber = dto.ChapterNumber,
                Title = dto.Title?.Trim() ?? $"Chương {dto.ChapterNumber}", UploadedAt = DateTime.UtcNow };
            _context.Chapters.Add(chapter);
            await _context.SaveChangesAsync(cancellationToken);
            var pages = (dto.PageUrls ?? []).Select((url, idx) => new Page { ChapterId = chapter.Id,
                PageNumber = idx + 1, ImageUrl = url.Trim() }).Where(page => !string.IsNullOrWhiteSpace(page.ImageUrl)).ToList();
            if (pages.Count > 0) { _context.Pages.AddRange(pages); await _context.SaveChangesAsync(cancellationToken); }
            await transaction.CommitAsync(cancellationToken);
            return new(ChapterOperationStatus.Success, "Chapter created successfully", chapter.Id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new(ChapterOperationStatus.ServerError, "Error creating chapter", Error: ex.Message);
        }
    }
}
