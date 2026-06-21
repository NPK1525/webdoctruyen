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
        public int? ReleaseYear { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relationships
        public List<MangaGenre> MangaGenres { get; set; } = [];
        public List<MangaAuthor> MangaAuthors { get; set; } = [];
        public List<MangaTheme> MangaThemes { get; set; } = [];
        public List<Chapter> Chapters { get; set; } = [];
    }
}
