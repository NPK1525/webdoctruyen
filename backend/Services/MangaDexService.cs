using MangaNPK.Models;
using Microsoft.Extensions.Caching.Memory;
using System.Globalization;
using System.Text.Json;

namespace MangaNPK.Services;

public class MangaDexService(HttpClient httpClient, IMemoryCache cache)
{
    private const string ApiBase = "https://api.mangadex.org";
    private const string UploadsBase = "https://uploads.mangadex.org";
    private readonly HttpClient _httpClient = httpClient;
    private readonly IMemoryCache _cache = cache;

    public async Task<MangaDexPreviewDto> GetMangaPreviewAsync(string input, CancellationToken cancellationToken = default)
    {
        var mangaId = MangaDexIdParser.ExtractMangaId(input);
        using var doc = await GetJsonAsync($"/manga/{mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist", cancellationToken);
        return ParseMangaPreview(doc.RootElement.GetProperty("data"));
    }

    public async Task<List<MangaDexChapterDto>> GetVietnameseChaptersAsync(string mangaId, CancellationToken cancellationToken = default)
    {
        var chapters = new List<MangaDexChapterDto>();
        var offset = 0;
        const int limit = 100;

        while (true)
        {
            // MangaDex chi tra toi da 100 chapter moi request nen phai lap theo offset.
            var path = $"/manga/{mangaId}/feed?translatedLanguage[]=vi&includes[]=scanlation_group&order[chapter]=desc&limit={limit}&offset={offset}";
            using var doc = await GetJsonAsync(path, cancellationToken);
            var root = doc.RootElement;
            var total = root.TryGetProperty("total", out var totalEl) ? totalEl.GetInt32() : 0;

            foreach (var item in root.GetProperty("data").EnumerateArray())
            {
                chapters.Add(ParseChapter(item));
            }

            offset += limit;
            if (offset >= total || total == 0)
            {
                break;
            }
        }

        return chapters;
    }

    public async Task<List<string>> GetChapterPageUrlsAsync(string chapterExternalId, bool dataSaver = false, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"mangadex-at-home:{chapterExternalId}:{dataSaver}";
        if (_cache.TryGetValue(cacheKey, out List<string>? cached) && cached is not null)
        {
            return cached;
        }

        using var doc = await GetJsonAsync($"/at-home/server/{chapterExternalId}", cancellationToken);
        var root = doc.RootElement;
        var baseUrl = root.GetProperty("baseUrl").GetString() ?? string.Empty;
        var chapter = root.GetProperty("chapter");
        var hash = chapter.GetProperty("hash").GetString() ?? string.Empty;
        var folder = dataSaver ? "data-saver" : "data";
        var filesElement = chapter.GetProperty(dataSaver ? "dataSaver" : "data");

        var urls = filesElement
            .EnumerateArray()
            .Select(file => $"{baseUrl}/{folder}/{hash}/{file.GetString()}")
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .ToList();

        _cache.Set(cacheKey, urls, TimeSpan.FromMinutes(5));
        return urls;
    }

    private async Task<JsonDocument> GetJsonAsync(string path, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{ApiBase}{path}");
        request.Headers.UserAgent.ParseAdd("MangaNPK/1.0");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
    }

    private static MangaDexPreviewDto ParseMangaPreview(JsonElement data)
    {
        var id = data.GetProperty("id").GetString() ?? string.Empty;
        var attributes = data.GetProperty("attributes");
        var relationships = data.GetProperty("relationships").EnumerateArray().ToList();
        var coverFile = string.Empty;
        var coverRel = relationships.FirstOrDefault(r => GetString(r, "type") == "cover_art");
        if (coverRel.ValueKind != JsonValueKind.Undefined)
        {
            coverFile = GetString(coverRel.GetPropertyOrDefault("attributes"), "fileName");
        }

        var tags = attributes.TryGetProperty("tags", out var tagsEl)
            ? tagsEl.EnumerateArray().Select(ParseTag).Where(t => !string.IsNullOrWhiteSpace(t.Name)).ToList()
            : [];

        return new MangaDexPreviewDto(
            Id: id,
            Title: PickLocalizedText(attributes.GetProperty("title")),
            AlternativeTitle: PickAlternativeTitle(attributes),
            Description: attributes.TryGetProperty("description", out var desc) ? PickLocalizedText(desc) : string.Empty,
            CoverUrl: string.IsNullOrWhiteSpace(coverFile) ? string.Empty : $"{UploadsBase}/covers/{id}/{coverFile}.512.jpg",
            Type: MapType(GetString(attributes, "originalLanguage")),
            Status: MapStatus(GetString(attributes, "status")),
            Demographic: MapDemographic(GetString(attributes, "publicationDemographic")),
            Format: MangaDexMetadataMapper.SelectPrimaryFormat(tags),
            ReleaseYear: attributes.TryGetProperty("year", out var yearEl) && yearEl.ValueKind == JsonValueKind.Number ? yearEl.GetInt32() : null,
            Authors: relationships
                .Where(r => GetString(r, "type") is "author" or "artist")
                .Select(r => new MangaDexAuthorDto(
                    Name: GetString(r.GetPropertyOrDefault("attributes"), "name"),
                    Role: GetString(r, "type") == "artist" ? "Art" : "Story"))
                .Where(a => !string.IsNullOrWhiteSpace(a.Name))
                .GroupBy(a => new { a.Name, a.Role })
                .Select(g => g.First())
                .ToList(),
            Tags: tags
        );
    }

    private static MangaDexChapterDto ParseChapter(JsonElement item)
    {
        var attrs = item.GetProperty("attributes");
        var chapterText = GetString(attrs, "chapter");
        var groups = item.GetProperty("relationships")
            .EnumerateArray()
            .Where(r => GetString(r, "type") == "scanlation_group")
            .Select(r => GetString(r.GetPropertyOrDefault("attributes"), "name"))
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .ToList();

        return new MangaDexChapterDto(
            Id: item.GetProperty("id").GetString() ?? string.Empty,
            ChapterNumber: ParseChapterNumber(chapterText),
            ChapterNumberText: chapterText,
            Title: GetString(attrs, "title"),
            PublishedAt: ParseDate(GetString(attrs, "publishAt")) ?? ParseDate(GetString(attrs, "createdAt")),
            ScanlationGroupName: string.Join(", ", groups)
        );
    }

    private static MangaDexTagDto ParseTag(JsonElement tag)
    {
        var attrs = tag.GetProperty("attributes");
        return new MangaDexTagDto(
            Name: PickLocalizedText(attrs.GetProperty("name")),
            Group: GetString(attrs, "group")
        );
    }

    private static double ParseChapterNumber(string value)
    {
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number))
        {
            return number;
        }

        return 0;
    }

    private static DateTime? ParseDate(string value)
    {
        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var date)
            ? date
            : null;
    }

    private static MangaStatus MapStatus(string status)
    {
        return status.Equals("completed", StringComparison.OrdinalIgnoreCase)
            ? MangaStatus.Completed
            : status.Equals("hiatus", StringComparison.OrdinalIgnoreCase) || status.Equals("cancelled", StringComparison.OrdinalIgnoreCase)
                ? MangaStatus.Hiatus
                : MangaStatus.Ongoing;
    }

    private static MangaType MapType(string originalLanguage)
    {
        // Suy ra loại truyện từ ngôn ngữ gốc của MangaDex.
        return originalLanguage.ToLowerInvariant() switch
        {
            "ko" => MangaType.Manhwa,
            "zh" or "zh-hk" => MangaType.Manhua,
            _ => MangaType.Manga
        };
    }

    private static MangaDemographic MapDemographic(string demographic)
    {
        return demographic.ToLowerInvariant() switch
        {
            "shounen" => MangaDemographic.Shounen,
            "shoujo" => MangaDemographic.Shoujo,
            "seinen" => MangaDemographic.Seinen,
            "josei" => MangaDemographic.Josei,
            _ => MangaDemographic.None
        };
    }

    private static string PickAlternativeTitle(JsonElement attributes)
    {
        if (!attributes.TryGetProperty("altTitles", out var altTitles) || altTitles.ValueKind != JsonValueKind.Array)
        {
            return string.Empty;
        }

        foreach (var item in altTitles.EnumerateArray())
        {
            var text = PickLocalizedText(item);
            if (!string.IsNullOrWhiteSpace(text))
            {
                return text;
            }
        }

        return string.Empty;
    }

    private static string PickLocalizedText(JsonElement map)
    {
        if (map.ValueKind != JsonValueKind.Object)
        {
            return string.Empty;
        }

        foreach (var key in new[] { "vi", "en", "ja-ro", "ja" })
        {
            if (map.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String)
            {
                return value.GetString() ?? string.Empty;
            }
        }

        var first = map.EnumerateObject().FirstOrDefault();
        return first.Value.ValueKind == JsonValueKind.String ? first.Value.GetString() ?? string.Empty : string.Empty;
    }

    private static string GetString(JsonElement element, string propertyName)
    {
        return element.ValueKind == JsonValueKind.Object
            && element.TryGetProperty(propertyName, out var value)
            && value.ValueKind == JsonValueKind.String
                ? value.GetString() ?? string.Empty
                : string.Empty;
    }
}

internal static class MangaDexJsonExtensions
{
    public static JsonElement GetPropertyOrDefault(this JsonElement element, string propertyName)
    {
        return element.ValueKind == JsonValueKind.Object && element.TryGetProperty(propertyName, out var value)
            ? value
            : default;
    }
}

public record MangaDexPreviewDto(
    string Id,
    string Title,
    string AlternativeTitle,
    string Description,
    string CoverUrl,
    MangaType Type,
    MangaStatus Status,
    MangaDemographic Demographic,
    MangaFormat Format,
    int? ReleaseYear,
    List<MangaDexAuthorDto> Authors,
    List<MangaDexTagDto> Tags);

public record MangaDexAuthorDto(string Name, string Role);

public record MangaDexTagDto(string Name, string Group);

public record MangaDexChapterDto(
    string Id,
    double ChapterNumber,
    string ChapterNumberText,
    string Title,
    DateTime? PublishedAt,
    string ScanlationGroupName);
