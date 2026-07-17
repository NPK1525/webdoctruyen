using System;
using System.Collections.Generic;

namespace MangaNPK.Models
{
    public class Manga
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string AlternativeTitle { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;
        public MangaType Type { get; set; }
        public MangaStatus Status { get; set; }
        public MangaDemographic Demographic { get; set; }
        public MangaFormat Format { get; set; }
        public string ContentWarnings { get; set; } = string.Empty;
        public int? ReleaseYear { get; set; }
        public int ViewCount { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Source { get; set; } = "Local";
        public string ExternalId { get; set; } = string.Empty;
        public DateTime? SyncedAt { get; set; }

        // Relationships
        public List<MangaGenre> MangaGenres { get; set; } = [];
        public List<MangaAuthor> MangaAuthors { get; set; } = [];
        public List<MangaTheme> MangaThemes { get; set; } = [];
        public List<Chapter> Chapters { get; set; } = [];
        public List<MangaContributor> Contributors { get; set; } = [];
    }
}
