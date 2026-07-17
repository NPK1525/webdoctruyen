namespace MangaNPK.Contracts.Admin;

public class CreateChapterDto
{
    public int MangaId { get; set; }
    public double ChapterNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public List<string> PageUrls { get; set; } = [];
}

public class UpdateChapterDto
{
    public double ChapterNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public List<string>? PageUrls { get; set; }
}
