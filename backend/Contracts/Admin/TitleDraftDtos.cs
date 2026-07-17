using MangaNPK.Models;

namespace MangaNPK.Contracts.Admin;

public class SaveTitleDraftDto
{
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public string EnglishTitle { get; set; } = string.Empty;
    public List<string> AlternativeTitles { get; set; } = [];
    public string Description { get; set; } = string.Empty;
    public string OriginalLanguage { get; set; } = "vi";
    public MangaType Type { get; set; } = MangaType.Manga;
    public MangaStatus Status { get; set; } = MangaStatus.Ongoing;
    public int? ReleaseYear { get; set; }
    public string StoryAuthor { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public List<int> GenreIds { get; set; } = [];
    public List<int> ThemeIds { get; set; } = [];
    public MangaDemographic Demographic { get; set; } = MangaDemographic.None;
    public MangaAgeRating AgeRating { get; set; } = MangaAgeRating.AllAges;
    public string CoverUrl { get; set; } = string.Empty;
    public string BannerUrl { get; set; } = string.Empty;
    public string OfficialWebsite { get; set; } = string.Empty;
    public string ReferenceUrl { get; set; } = string.Empty;
    public string TrackingUrl { get; set; } = string.Empty;
    public string DataSource { get; set; } = "Local";
    public string MangaDexId { get; set; } = string.Empty;
    public string ScanlationGroup { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public bool SubmitForReview { get; set; }
}

public class RejectTitleDraftDto
{
    public string Reason { get; set; } = string.Empty;
}
