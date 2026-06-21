namespace MangaNPK.Models
{
    public class MangaAuthor
    {
        public int MangaId { get; set; }
        public Manga Manga { get; set; } = null!;

        public int AuthorId { get; set; }
        public Author Author { get; set; } = null!;

        public string Role { get; set; } = "Story & Art"; // e.g. "Story", "Art", "Story & Art"
    }
}
