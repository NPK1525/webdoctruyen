using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MangaNPK.Models;

public class MangaList
{
    [Key]
    public int Id { get; set; }

    public int UserId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    public bool IsPublic { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public List<MangaListItem> Items { get; set; } = [];
}

public class MangaListItem
{
    public int ListId { get; set; }
    public int MangaId { get; set; }

    public int Order { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ListId))]
    public MangaList List { get; set; } = null!;

    [ForeignKey(nameof(MangaId))]
    public Manga Manga { get; set; } = null!;
}
