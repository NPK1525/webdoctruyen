using System;

namespace MangaNPK.Models
{
    public class Report
    {
        public int Id { get; set; }
        public int ReporterId { get; set; }
        public ReportTargetType TargetType { get; set; }
        public int? MangaId { get; set; }
        public int? ChapterId { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Explanation { get; set; }
        public ReportStatus Status { get; set; } = ReportStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
        public int? ResolvedByUserId { get; set; }
        public string? AdminNote { get; set; }

        public User Reporter { get; set; } = null!;
        public User? ResolvedByUser { get; set; }
        public Manga? Manga { get; set; }
        public Chapter? Chapter { get; set; }
    }

    public enum ReportTargetType
    {
        Manga = 1,
        Chapter = 2
    }

    public enum ReportStatus
    {
        Pending = 1,
        Resolved = 2,
        Dismissed = 3
    }
}
