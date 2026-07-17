using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace MangaNPK.Models
{
    public class Chapter
    {
        public int Id { get; set; }
        public int MangaId { get; set; }
        
        [JsonIgnore]
        public Manga Manga { get; set; } = null!;
        
        public double ChapterNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public string Source { get; set; } = "Local";
        public string ExternalId { get; set; } = string.Empty;
        public string TranslatedLanguage { get; set; } = "vi";
        public DateTime? PublishedAt { get; set; }
        public DateTime? SyncedAt { get; set; }
        public string ScanlationGroupName { get; set; } = string.Empty;

        // Relationships
        public List<Page> Pages { get; set; } = [];
    }
}
