using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class TitleSubmissionPayload
{
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public string EnglishTitle { get; set; } = string.Empty;
    public List<string> AlternativeTitles { get; set; } = [];
    public string Description { get; set; } = string.Empty;
    public string OriginalLanguage { get; set; } = "vi";
    public MangaType Type { get; set; } = MangaType.Manga;
    public MangaStatus Status { get; set; } = MangaStatus.Ongoing;
    public MangaDemographic Demographic { get; set; } = MangaDemographic.None;
    public MangaFormat Format { get; set; } = MangaFormat.None;
    public MangaAgeRating AgeRating { get; set; } = MangaAgeRating.AllAges;
    public int? ReleaseYear { get; set; }
    public string CoverUrl { get; set; } = string.Empty;
    public string BannerUrl { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public string OfficialWebsite { get; set; } = string.Empty;
    public string ReferenceUrl { get; set; } = string.Empty;
    public string TrackingUrl { get; set; } = string.Empty;
    public string DataSource { get; set; } = "Local";
    public string MangaDexId { get; set; } = string.Empty;
    public string ScanlationGroup { get; set; } = string.Empty;
    public string TranslationLanguage { get; set; } = "vi";
    public string Note { get; set; } = string.Empty;
    public List<int> GenreIds { get; set; } = [];
    public List<int> ThemeIds { get; set; } = [];
    public List<string> ContentWarnings { get; set; } = [];
    public List<TitleAuthorInput> Authors { get; set; } = [];
}

public sealed class TitleAuthorInput
{
    public int? AuthorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = "Story & Art";
}

public sealed record TitleSubmissionResult(string Kind, int? DraftId = null, int? MangaId = null);

public static class TitleSubmissionValidation
{
    private static readonly HashSet<string> SupportedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Story", "Art", "Story & Art"
    };

    public static string? Validate(TitleSubmissionPayload payload, bool requireCover)
    {
        if (payload == null) return "Dữ liệu truyện không hợp lệ.";
        if (string.IsNullOrWhiteSpace(payload.Title)) return "Tên truyện là bắt buộc.";
        if (string.IsNullOrWhiteSpace(payload.Description)) return "Mô tả là bắt buộc.";
        if (requireCover && string.IsNullOrWhiteSpace(payload.CoverUrl)) return "Ảnh bìa là bắt buộc khi gửi duyệt.";
        if (payload.ReleaseYear is < 1900 or > 2100) return "Năm phát hành không hợp lệ.";
        if (!Enum.IsDefined(payload.Format)) return "Format không hợp lệ.";

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var author in payload.Authors ?? [])
        {
            var name = author.Name.Trim();
            if (author.AuthorId is null && string.IsNullOrWhiteSpace(name))
                return "Mỗi tác giả phải được chọn hoặc có tên mới.";
            if (name.Length > 200) return "Tên tác giả không được dài quá 200 ký tự.";
            if (!SupportedRoles.Contains(author.Role.Trim())) return "Vai trò tác giả không hợp lệ.";
            var key = $"{author.AuthorId?.ToString() ?? name.ToUpperInvariant()}|{author.Role.Trim().ToUpperInvariant()}";
            if (!seen.Add(key)) return "Không được thêm tác giả trùng vai trò.";
        }

        return null;
    }
}
