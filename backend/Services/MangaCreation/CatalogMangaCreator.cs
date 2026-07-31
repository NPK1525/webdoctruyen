using MangaNPK.Contracts.Admin;
using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class CatalogMangaCreator : MangaCreator<CreateMangaDto>
{
    protected override Manga CreateManga(
        CreateMangaDto dto,
        DateTime now) => new()
    {
        Title = dto.Title.Trim(),
        AlternativeTitle = dto.AlternativeTitle?.Trim() ?? string.Empty,
        Description = dto.Description?.Trim() ?? string.Empty,
        CoverUrl = dto.CoverUrl?.Trim() ?? string.Empty,
        Type = dto.Type,
        Status = dto.Status,
        Demographic = dto.Demographic,
        Format = dto.Format,
        ContentWarnings = string.Join(
            ',',
            MangaContentWarning.Normalize(dto.ContentWarnings)),
        ReleaseYear = dto.ReleaseYear,
        CreatedAt = now
    };
}
