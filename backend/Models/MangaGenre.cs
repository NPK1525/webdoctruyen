namespace MangaNPK.Models
{
    public class MangaGenre
    {
        public int MangaId { get; set; }
        public Manga Manga { get; set; } = null!;

        public int GenreId { get; set; }
        public Genre Genre { get; set; } = null!;
    }
}
