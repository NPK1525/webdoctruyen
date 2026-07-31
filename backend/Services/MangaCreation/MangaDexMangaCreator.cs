using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class MangaDexMangaCreator : MangaCreator<MangaDexPreviewDto>
{
    protected override Manga CreateManga(
        MangaDexPreviewDto preview,
        DateTime now) => new()
    {
        Title = preview.Title,
        AlternativeTitle = preview.AlternativeTitle,
        Description = preview.Description,
        CoverUrl = preview.CoverUrl,
        Type = preview.Type,
        Status = preview.Status,
        Demographic = preview.Demographic,
        Format = preview.Format,
        ContentWarnings = string.Join(
            ',',
            MangaContentWarning.Normalize(
                preview.Tags
                    .Where(tag => string.Equals(
                        tag.Group,
                        "content",
                        StringComparison.OrdinalIgnoreCase))
                    .Select(tag => tag.Name))),
        ReleaseYear = preview.ReleaseYear,
        Source = "MangaDex",
        ExternalId = preview.Id,
        CreatedAt = now,
        SyncedAt = now
    };
}
