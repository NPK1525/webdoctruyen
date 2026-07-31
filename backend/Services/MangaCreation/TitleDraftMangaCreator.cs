using System.Text.Json;
using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class TitleDraftMangaCreator : MangaCreator<TitleDraft>
{
    protected override Manga CreateManga(
        TitleDraft draft,
        DateTime now) => new()
    {
        Title = draft.Title.Trim(),
        AlternativeTitle = BuildAlternativeTitle(draft),
        Description = draft.Description.Trim(),
        CoverUrl = draft.CoverUrl.Trim(),
        Type = draft.Type,
        Status = draft.Status,
        Demographic = draft.Demographic,
        Format = draft.Format == MangaFormat.None
            && draft.Type == MangaType.Webtoon
                ? MangaFormat.WebComic
                : draft.Format,
        ContentWarnings = draft.ContentWarnings,
        ReleaseYear = draft.ReleaseYear,
        Source = draft.DataSource,
        ExternalId = draft.DataSource == "MangaDex"
            ? draft.MangaDexId
            : string.Empty,
        CreatedAt = now,
        SyncedAt = draft.DataSource == "MangaDex" ? now : null
    };

    private static string BuildAlternativeTitle(TitleDraft draft) =>
        string.Join(
            " | ",
            new[] { draft.OriginalTitle, draft.EnglishTitle }
                .Concat(ReadStrings(draft.AlternativeTitlesJson))
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct());

    private static List<string> ReadStrings(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
