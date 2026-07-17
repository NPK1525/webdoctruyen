using System;

namespace MangaNPK.Models
{
    public class Comment
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int? MangaId { get; set; }
        public int? ChapterId { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
        public Manga? Manga { get; set; }
        public Chapter? Chapter { get; set; }
    }
}
