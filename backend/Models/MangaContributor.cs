using System;

namespace MangaNPK.Models;

/// <summary>
/// Grants a user chapter-management access for one approved manga.
/// </summary>
public class MangaContributor
{
    public int MangaId { get; set; }
    public Manga Manga { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

    public int GrantedByUserId { get; set; }
    public User GrantedByUser { get; set; } = null!;
}
