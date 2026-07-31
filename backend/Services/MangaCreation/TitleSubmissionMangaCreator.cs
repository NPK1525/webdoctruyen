using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class TitleSubmissionMangaCreator
    : MangaCreator<TitleSubmissionPayload>
{
    protected override Manga CreateManga(
        TitleSubmissionPayload payload,
        DateTime now) => new()
    {
        Title = payload.Title.Trim(),
        AlternativeTitle = string.Join(
            " | ",
            new[] { payload.OriginalTitle, payload.EnglishTitle }
                .Concat(payload.AlternativeTitles)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct()),
        Description = payload.Description.Trim(),
        CoverUrl = payload.CoverUrl.Trim(),
        Type = payload.Type,
        Status = payload.Status,
        Demographic = payload.Demographic,
        Format = payload.Format,
        ContentWarnings = string.Join(
            ',',
            MangaContentWarning.Normalize(payload.ContentWarnings)),
        ReleaseYear = payload.ReleaseYear,
        Source = string.IsNullOrWhiteSpace(payload.DataSource)
            ? "Local"
            : payload.DataSource.Trim(),
        ExternalId = payload.DataSource == "MangaDex"
            ? payload.MangaDexId.Trim()
            : string.Empty,
        CreatedAt = now,
        SyncedAt = payload.DataSource == "MangaDex" ? now : null
    };
}
