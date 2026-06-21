namespace MangaNPK.Models
{
    public class MangaTheme
    {
        public int MangaId { get; set; }
        public Manga Manga { get; set; } = null!;

        public int ThemeId { get; set; }
        public Theme Theme { get; set; } = null!;
    }
}
