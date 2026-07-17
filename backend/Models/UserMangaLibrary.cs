using System;

namespace MangaNPK.Models
{
    public class UserMangaLibrary
    {
        public int UserId { get; set; }
        public int MangaId { get; set; }
        public ReadingStatus Status { get; set; } = ReadingStatus.Reading;
        public int? LastChapterId { get; set; }
        public int LastPageNumber { get; set; } = 0;
        public DateTime FollowedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
        public Manga Manga { get; set; } = null!;
        public Chapter? LastChapter { get; set; }
    }
}
