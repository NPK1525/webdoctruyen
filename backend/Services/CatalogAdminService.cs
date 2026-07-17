using MangaNPK.Contracts.Admin;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public enum CatalogOperationStatus { Success, NotFound, BadRequest, ServerError }
public sealed record CatalogOperationResult(CatalogOperationStatus Status, string Message, int? EntityId = null, string? Error = null);

public sealed class CatalogAdminService(MangaDbContext context)
{
    private readonly MangaDbContext _context = context;

    public async Task<(Author? Entity, string? Error)> CreateAuthorAsync(CreateAuthorDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return (null, "Author name is required");
        var author = new Author { Name = dto.Name.Trim(), Biography = dto.Biography?.Trim() ?? string.Empty };
        _context.Authors.Add(author);
        await _context.SaveChangesAsync(cancellationToken);
        return (author, null);
    }

    public async Task<(Genre? Entity, string? Error)> CreateGenreAsync(CreateGenreDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return (null, "Genre name is required");
        var name = dto.Name.Trim();
        var genre = new Genre { Name = name, Slug = string.IsNullOrWhiteSpace(dto.Slug) ? name.ToLower().Replace(" ", "-") : dto.Slug.Trim().ToLower() };
        _context.Genres.Add(genre);
        await _context.SaveChangesAsync(cancellationToken);
        return (genre, null);
    }

    public async Task<(Theme? Entity, string? Error)> CreateThemeAsync(CreateThemeDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return (null, "Theme name is required");
        var name = dto.Name.Trim();
        var theme = new Theme { Name = name, Slug = string.IsNullOrWhiteSpace(dto.Slug) ? name.ToLower().Replace(" ", "-") : dto.Slug.Trim().ToLower() };
        _context.Themes.Add(theme);
        await _context.SaveChangesAsync(cancellationToken);
        return (theme, null);
    }

    public async Task<CatalogOperationResult> CreateMangaAsync(CreateMangaDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Title)) return new(CatalogOperationStatus.BadRequest, "Manga title is required");
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var manga = new Manga { Title = dto.Title.Trim(), AlternativeTitle = dto.AlternativeTitle?.Trim() ?? string.Empty,
                Description = dto.Description?.Trim() ?? string.Empty, CoverUrl = dto.CoverUrl?.Trim() ?? string.Empty,
                Type = dto.Type, Status = dto.Status, Demographic = dto.Demographic, Format = dto.Format,
                ContentWarnings = string.Join(',', MangaContentWarning.Normalize(dto.ContentWarnings)), ReleaseYear = dto.ReleaseYear,
                CreatedAt = DateTime.UtcNow };
            _context.Mangas.Add(manga);
            await _context.SaveChangesAsync(cancellationToken);
            AddRelations(manga.Id, dto);
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new(CatalogOperationStatus.Success, "Manga created successfully", manga.Id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new(CatalogOperationStatus.ServerError, "Error creating manga", Error: ex.Message);
        }
    }

    public async Task<CatalogOperationResult> UpdateMangaAsync(int id, CreateMangaDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Title)) return new(CatalogOperationStatus.BadRequest, "Manga title is required");
        var manga = await _context.Mangas.Include(item => item.MangaAuthors).Include(item => item.MangaGenres).Include(item => item.MangaThemes)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (manga == null) return new(CatalogOperationStatus.NotFound, "Manga not found");
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            manga.Title = dto.Title.Trim(); manga.AlternativeTitle = dto.AlternativeTitle?.Trim() ?? string.Empty;
            manga.Description = dto.Description?.Trim() ?? string.Empty; manga.CoverUrl = dto.CoverUrl?.Trim() ?? string.Empty;
            manga.Type = dto.Type; manga.Status = dto.Status; manga.Demographic = dto.Demographic; manga.Format = dto.Format;
            manga.ContentWarnings = string.Join(',', MangaContentWarning.Normalize(dto.ContentWarnings)); manga.ReleaseYear = dto.ReleaseYear;
            _context.MangaAuthors.RemoveRange(manga.MangaAuthors); _context.MangaGenres.RemoveRange(manga.MangaGenres); _context.MangaThemes.RemoveRange(manga.MangaThemes);
            AddRelations(manga.Id, dto);
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new(CatalogOperationStatus.Success, "Manga updated successfully", manga.Id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new(CatalogOperationStatus.ServerError, "Error updating manga", Error: ex.Message);
        }
    }

    public async Task<CatalogOperationResult> DeleteMangaAsync(int id, CancellationToken cancellationToken = default)
    {
        var manga = await _context.Mangas.FindAsync([id], cancellationToken);
        if (manga == null) return new(CatalogOperationStatus.NotFound, "Manga not found");
        _context.Mangas.Remove(manga);
        await _context.SaveChangesAsync(cancellationToken);
        return new(CatalogOperationStatus.Success, "Manga deleted successfully", id);
    }

    private void AddRelations(int mangaId, CreateMangaDto dto)
    {
        _context.MangaAuthors.AddRange((dto.Authors ?? []).Select(author => new MangaAuthor { MangaId = mangaId, AuthorId = author.AuthorId, Role = string.IsNullOrWhiteSpace(author.Role) ? "Story & Art" : author.Role.Trim() }));
        _context.MangaGenres.AddRange((dto.GenreIds ?? []).Select(genreId => new MangaGenre { MangaId = mangaId, GenreId = genreId }));
        _context.MangaThemes.AddRange((dto.ThemeIds ?? []).Select(themeId => new MangaTheme { MangaId = mangaId, ThemeId = themeId }));
    }
}
