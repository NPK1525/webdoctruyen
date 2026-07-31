namespace MangaNPK.Services;

public sealed class LoggingMangaDexProxy(
    IMangaDexService inner,
    ILogger<LoggingMangaDexProxy> logger) : IMangaDexService
{
    private readonly IMangaDexService _inner = inner;
    private readonly ILogger<LoggingMangaDexProxy> _logger = logger;

    public async Task<MangaDexPreviewDto> GetMangaPreviewAsync(
        string input,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Calling MangaDex preview API.");
        try
        {
            var result = await _inner.GetMangaPreviewAsync(
                input,
                cancellationToken);
            _logger.LogInformation("MangaDex preview API succeeded.");
            return result;
        }
        catch (Exception exception)
            when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "MangaDex preview API failed.");
            throw;
        }
    }

    public async Task<List<MangaDexChapterDto>> GetVietnameseChaptersAsync(
        string mangaId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Calling MangaDex chapter feed API.");
        try
        {
            var result = await _inner.GetVietnameseChaptersAsync(
                mangaId,
                cancellationToken);
            _logger.LogInformation(
                "MangaDex chapter feed returned {ChapterCount} chapters.",
                result.Count);
            return result;
        }
        catch (Exception exception)
            when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "MangaDex chapter feed API failed.");
            throw;
        }
    }
}
