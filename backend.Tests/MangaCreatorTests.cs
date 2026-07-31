using MangaNPK.Contracts.Admin;
using MangaNPK.Models;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public sealed class MangaCreatorTests
{
    [Fact]
    public void CatalogCreator_PreservesExistingScalarMapping()
    {
        var now = new DateTime(2026, 7, 31, 1, 2, 3, DateTimeKind.Utc);
        var dto = new CreateMangaDto
        {
            Title = "  Title  ",
            AlternativeTitle = " Alt ",
            Description = " Description ",
            CoverUrl = " https://example.test/cover.jpg ",
            Type = MangaType.Manga,
            Status = MangaStatus.Ongoing,
            Demographic = MangaDemographic.Shounen,
            Format = MangaFormat.WebComic,
            ReleaseYear = 2026,
            ContentWarnings = ["Gore"]
        };

        var manga = new CatalogMangaCreator().Create(dto, now);

        Assert.Equal("Title", manga.Title);
        Assert.Equal("Alt", manga.AlternativeTitle);
        Assert.Equal("Description", manga.Description);
        Assert.Equal("https://example.test/cover.jpg", manga.CoverUrl);
        Assert.Equal(dto.Type, manga.Type);
        Assert.Equal(dto.Status, manga.Status);
        Assert.Equal(dto.Demographic, manga.Demographic);
        Assert.Equal(dto.Format, manga.Format);
        Assert.Equal("Gore", manga.ContentWarnings);
        Assert.Equal(2026, manga.ReleaseYear);
        Assert.Equal("Local", manga.Source);
        Assert.Equal(string.Empty, manga.ExternalId);
        Assert.Equal(now, manga.CreatedAt);
        Assert.Null(manga.SyncedAt);
    }

    [Fact]
    public void TitleDraftCreator_PreservesExistingScalarMappingAndWebtoonFallback()
    {
        var now = new DateTime(2026, 7, 31, 2, 3, 4, DateTimeKind.Utc);
        var draft = new TitleDraft
        {
            Title = "  Draft title  ",
            OriginalTitle = "原題",
            EnglishTitle = "English title",
            AlternativeTitlesJson = "[\"Alt one\",\"English title\",\" Alt two \"]",
            Description = "  Description  ",
            CoverUrl = "  https://example.test/draft.jpg  ",
            Type = MangaType.Webtoon,
            Status = MangaStatus.Ongoing,
            Demographic = MangaDemographic.Seinen,
            Format = MangaFormat.None,
            ContentWarnings = "Gore",
            ReleaseYear = 2025,
            DataSource = "MangaDex",
            MangaDexId = "draft-md-id"
        };

        var manga = new TitleDraftMangaCreator().Create(draft, now);

        Assert.Equal("Draft title", manga.Title);
        Assert.Equal(
            "原題 | English title | Alt one | Alt two",
            manga.AlternativeTitle);
        Assert.Equal("Description", manga.Description);
        Assert.Equal("https://example.test/draft.jpg", manga.CoverUrl);
        Assert.Equal(MangaType.Webtoon, manga.Type);
        Assert.Equal(MangaStatus.Ongoing, manga.Status);
        Assert.Equal(MangaDemographic.Seinen, manga.Demographic);
        Assert.Equal(MangaFormat.WebComic, manga.Format);
        Assert.Equal("Gore", manga.ContentWarnings);
        Assert.Equal(2025, manga.ReleaseYear);
        Assert.Equal("MangaDex", manga.Source);
        Assert.Equal("draft-md-id", manga.ExternalId);
        Assert.Equal(now, manga.CreatedAt);
        Assert.Equal(now, manga.SyncedAt);
    }

    [Fact]
    public void TitleSubmissionCreator_MapsLocalPayloadLikeExistingService()
    {
        var now = new DateTime(2026, 7, 31, 3, 4, 5, DateTimeKind.Utc);
        var payload = new TitleSubmissionPayload
        {
            Title = "  Submitted title  ",
            OriginalTitle = "Original",
            EnglishTitle = "English",
            AlternativeTitles = ["English", " Alt "],
            Description = "  Description  ",
            CoverUrl = "  https://example.test/submitted.jpg  ",
            Type = MangaType.Manga,
            Status = MangaStatus.Completed,
            Demographic = MangaDemographic.Josei,
            Format = MangaFormat.Book,
            ContentWarnings = [" gore ", "unsupported"],
            ReleaseYear = 2024,
            DataSource = ""
        };

        var manga = new TitleSubmissionMangaCreator().Create(payload, now);

        Assert.Equal("Submitted title", manga.Title);
        Assert.Equal("Original | English | Alt", manga.AlternativeTitle);
        Assert.Equal("Description", manga.Description);
        Assert.Equal("https://example.test/submitted.jpg", manga.CoverUrl);
        Assert.Equal(payload.Type, manga.Type);
        Assert.Equal(payload.Status, manga.Status);
        Assert.Equal(payload.Demographic, manga.Demographic);
        Assert.Equal(payload.Format, manga.Format);
        Assert.Equal("Gore", manga.ContentWarnings);
        Assert.Equal(2024, manga.ReleaseYear);
        Assert.Equal("Local", manga.Source);
        Assert.Equal(string.Empty, manga.ExternalId);
        Assert.Equal(now, manga.CreatedAt);
        Assert.Null(manga.SyncedAt);
    }

    [Fact]
    public void TitleSubmissionCreator_PreservesMangaDexIdentity()
    {
        var now = new DateTime(2026, 7, 31, 4, 5, 6, DateTimeKind.Utc);
        var payload = new TitleSubmissionPayload
        {
            Title = "Title",
            Description = "Description",
            CoverUrl = "https://example.test/cover.jpg",
            DataSource = "MangaDex",
            MangaDexId = "  external-id  "
        };

        var manga = new TitleSubmissionMangaCreator().Create(payload, now);

        Assert.Equal("MangaDex", manga.Source);
        Assert.Equal("external-id", manga.ExternalId);
        Assert.Equal(now, manga.SyncedAt);
    }

    [Fact]
    public void MangaDexCreator_PreservesImportedScalarMapping()
    {
        var now = new DateTime(2026, 7, 31, 5, 6, 7, DateTimeKind.Utc);
        var preview = new MangaDexPreviewDto(
            "external-id",
            "Imported title",
            "Imported alternative",
            "Imported description",
            "https://uploads.test/imported.jpg",
            MangaType.Manhwa,
            MangaStatus.Hiatus,
            MangaDemographic.Seinen,
            MangaFormat.Adaptation,
            2023,
            [],
            [
                new MangaDexTagDto("Gore", "content"),
                new MangaDexTagDto("Sexual Violence", "CONTENT"),
                new MangaDexTagDto("Action", "genre")
            ]);

        var manga = new MangaDexMangaCreator().Create(preview, now);

        Assert.Equal(preview.Title, manga.Title);
        Assert.Equal(preview.AlternativeTitle, manga.AlternativeTitle);
        Assert.Equal(preview.Description, manga.Description);
        Assert.Equal(preview.CoverUrl, manga.CoverUrl);
        Assert.Equal(preview.Type, manga.Type);
        Assert.Equal(preview.Status, manga.Status);
        Assert.Equal(preview.Demographic, manga.Demographic);
        Assert.Equal(preview.Format, manga.Format);
        Assert.Equal("Gore,Sexual Violence", manga.ContentWarnings);
        Assert.Equal(preview.ReleaseYear, manga.ReleaseYear);
        Assert.Equal("MangaDex", manga.Source);
        Assert.Equal(preview.Id, manga.ExternalId);
        Assert.Equal(now, manga.CreatedAt);
        Assert.Equal(now, manga.SyncedAt);
    }
}
