using MangaNPK.Services;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace MangaNPK.Tests;

public sealed class CachedMangaDexChapterPageServiceTests
{
    [Fact]
    public async Task CacheMiss_DelegatesOnce_ThenCacheHitSkipsInner()
    {
        var expected = new List<string> { "https://uploads.test/1.jpg" };
        var inner = new StubChapterPageService(expected);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var decorator = new CachedMangaDexChapterPageService(inner, cache);

        var first = await decorator.GetChapterPageUrlsAsync("chapter-1");
        var second = await decorator.GetChapterPageUrlsAsync("chapter-1");

        Assert.Same(expected, first);
        Assert.Same(expected, second);
        Assert.Equal(1, inner.CallCount);
    }

    [Fact]
    public async Task DataSaver_UsesIndependentCacheEntry()
    {
        var inner = new StubChapterPageService(["https://uploads.test/1.jpg"]);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var decorator = new CachedMangaDexChapterPageService(inner, cache);

        await decorator.GetChapterPageUrlsAsync("chapter-1", false);
        await decorator.GetChapterPageUrlsAsync("chapter-1", true);

        Assert.Equal(2, inner.CallCount);
    }

    [Fact]
    public async Task InnerException_IsNotConverted()
    {
        var expected = new HttpRequestException("MangaDex unavailable");
        var inner = new ThrowingChapterPageService(expected);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var decorator = new CachedMangaDexChapterPageService(inner, cache);

        var actual = await Assert.ThrowsAsync<HttpRequestException>(
            () => decorator.GetChapterPageUrlsAsync("chapter-1"));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task CancellationToken_IsForwarded()
    {
        var inner = new StubChapterPageService([]);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var decorator = new CachedMangaDexChapterPageService(inner, cache);
        using var source = new CancellationTokenSource();

        await decorator.GetChapterPageUrlsAsync(
            "chapter-1",
            cancellationToken: source.Token);

        Assert.Equal(source.Token, inner.LastToken);
    }

    private sealed class StubChapterPageService(List<string> result)
        : IMangaDexChapterPageService
    {
        public int CallCount { get; private set; }
        public CancellationToken LastToken { get; private set; }

        public Task<List<string>> GetChapterPageUrlsAsync(
            string chapterExternalId,
            bool dataSaver = false,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            LastToken = cancellationToken;
            return Task.FromResult(result);
        }
    }

    private sealed class ThrowingChapterPageService(Exception exception)
        : IMangaDexChapterPageService
    {
        public Task<List<string>> GetChapterPageUrlsAsync(
            string chapterExternalId,
            bool dataSaver = false,
            CancellationToken cancellationToken = default) =>
            Task.FromException<List<string>>(exception);
    }
}
