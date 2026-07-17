using System;

namespace MangaNPK.Models
{
    public class Rating
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int MangaId { get; set; }
        public int Score { get; set; } // 1-10
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
        public Manga Manga { get; set; } = null!;
    }
}
