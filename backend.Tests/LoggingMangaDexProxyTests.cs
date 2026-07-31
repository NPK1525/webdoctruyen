using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace MangaNPK.Tests;

public sealed class LoggingMangaDexProxyTests
{
    [Fact]
    public async Task Preview_ForwardsInputAndReturnsSameResult()
    {
        var expected = CreatePreview();
        var inner = new StubMangaDexService { Preview = expected };
        var proxy = new LoggingMangaDexProxy(
            inner,
            NullLogger<LoggingMangaDexProxy>.Instance);
        using var source = new CancellationTokenSource();

        var actual = await proxy.GetMangaPreviewAsync(
            "mangadex-id",
            source.Token);

        Assert.Same(expected, actual);
        Assert.Equal("mangadex-id", inner.PreviewInput);
        Assert.Equal(source.Token, inner.PreviewToken);
        Assert.Equal(1, inner.PreviewCalls);
    }

    [Fact]
    public async Task Chapters_ForwardsInputAndReturnsSameList()
    {
        var expected = new List<MangaDexChapterDto>();
        var inner = new StubMangaDexService { Chapters = expected };
        var proxy = new LoggingMangaDexProxy(
            inner,
            NullLogger<LoggingMangaDexProxy>.Instance);
        using var source = new CancellationTokenSource();

        var actual = await proxy.GetVietnameseChaptersAsync(
            "manga-id",
            source.Token);

        Assert.Same(expected, actual);
        Assert.Equal("manga-id", inner.ChapterInput);
        Assert.Equal(source.Token, inner.ChapterToken);
        Assert.Equal(1, inner.ChapterCalls);
    }

    [Fact]
    public async Task Exception_IsRethrownWithoutConversion()
    {
        var expected = new HttpRequestException("failure");
        var inner = new StubMangaDexService { Exception = expected };
        var proxy = new LoggingMangaDexProxy(
            inner,
            NullLogger<LoggingMangaDexProxy>.Instance);

        var actual = await Assert.ThrowsAsync<HttpRequestException>(
            () => proxy.GetMangaPreviewAsync("manga-id"));

        Assert.Same(expected, actual);
        Assert.Equal(1, inner.PreviewCalls);
    }

    [Fact]
    public async Task Cancellation_IsRethrownWithoutConversion()
    {
        var expected = new OperationCanceledException();
        var inner = new StubMangaDexService { Exception = expected };
        var proxy = new LoggingMangaDexProxy(
            inner,
            NullLogger<LoggingMangaDexProxy>.Instance);

        var actual = await Assert.ThrowsAsync<OperationCanceledException>(
            () => proxy.GetMangaPreviewAsync("manga-id"));

        Assert.Same(expected, actual);
    }

    private static MangaDexPreviewDto CreatePreview() => new(
        "manga-id",
        "Title",
        "Alternative",
        "Description",
        "https://uploads.test/cover.jpg",
        MangaType.Manga,
        MangaStatus.Ongoing,
        MangaDemographic.Shounen,
        MangaFormat.WebComic,
        2026,
        [],
        []);

    private sealed class StubMangaDexService : IMangaDexService
    {
        public MangaDexPreviewDto? Preview { get; init; }
        public List<MangaDexChapterDto>? Chapters { get; init; }
        public Exception? Exception { get; init; }
        public string? PreviewInput { get; private set; }
        public CancellationToken PreviewToken { get; private set; }
        public int PreviewCalls { get; private set; }
        public string? ChapterInput { get; private set; }
        public CancellationToken ChapterToken { get; private set; }
        public int ChapterCalls { get; private set; }

        public Task<MangaDexPreviewDto> GetMangaPreviewAsync(
            string input,
            CancellationToken cancellationToken = default)
        {
            PreviewCalls++;
            PreviewInput = input;
            PreviewToken = cancellationToken;
            return Exception is null
                ? Task.FromResult(Preview!)
                : Task.FromException<MangaDexPreviewDto>(Exception);
        }

        public Task<List<MangaDexChapterDto>> GetVietnameseChaptersAsync(
            string mangaId,
            CancellationToken cancellationToken = default)
        {
            ChapterCalls++;
            ChapterInput = mangaId;
            ChapterToken = cancellationToken;
            return Exception is null
                ? Task.FromResult(Chapters!)
                : Task.FromException<List<MangaDexChapterDto>>(Exception);
        }
    }
}
