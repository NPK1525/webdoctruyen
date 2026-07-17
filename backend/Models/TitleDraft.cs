using System;

namespace MangaNPK.Models
{
    public class TitleDraft
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string OriginalTitle { get; set; } = string.Empty;
        public string EnglishTitle { get; set; } = string.Empty;
        public string AlternativeTitlesJson { get; set; } = "[]";
        public string Description { get; set; } = string.Empty;
        public string OriginalLanguage { get; set; } = "vi";
        public MangaType Type { get; set; } = MangaType.Manga;
        public MangaStatus Status { get; set; } = MangaStatus.Ongoing;
        public int? ReleaseYear { get; set; }
        public string StoryAuthor { get; set; } = string.Empty;
        public string Artist { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
        public string GenreIdsJson { get; set; } = "[]";
        public string ThemeIdsJson { get; set; } = "[]";
        public MangaDemographic Demographic { get; set; } = MangaDemographic.None;
        public MangaFormat Format { get; set; } = MangaFormat.None;
        public MangaAgeRating AgeRating { get; set; } = MangaAgeRating.AllAges;
        public string ContentWarnings { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;
        public string BannerUrl { get; set; } = string.Empty;
        public string OfficialWebsite { get; set; } = string.Empty;
        public string ReferenceUrl { get; set; } = string.Empty;
        public string TrackingUrl { get; set; } = string.Empty;
        public string DataSource { get; set; } = "Local";
        public string MangaDexId { get; set; } = string.Empty;
        public string ScanlationGroup { get; set; } = string.Empty;
        public string TranslationLanguage { get; set; } = "vi";
        public string Note { get; set; } = string.Empty;
        public TitleDraftReviewStatus ReviewStatus { get; set; } = TitleDraftReviewStatus.Draft;
        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int? ReviewedByUserId { get; set; }
        public User? ReviewedByUser { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string RejectionReason { get; set; } = string.Empty;
        public int? ApprovedMangaId { get; set; }
        public Manga? ApprovedManga { get; set; }
        public List<TitleDraftAuthor> Authors { get; set; } = [];
    }
}
