namespace MangaNPK.Models;

public class TitleDraftAuthor
{
    public int Id { get; set; }
    public int TitleDraftId { get; set; }
    public TitleDraft TitleDraft { get; set; } = null!;
    public int? AuthorId { get; set; }
    public Author? Author { get; set; }
    public string ProposedName { get; set; } = string.Empty;
    public string Role { get; set; } = "Story & Art";
}
