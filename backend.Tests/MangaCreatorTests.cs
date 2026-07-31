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
}
