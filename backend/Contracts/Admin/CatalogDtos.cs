using MangaNPK.Models;

namespace MangaNPK.Contracts.Admin;

public class CreateAuthorDto
{
    public string Name { get; set; } = string.Empty;
    public string Biography { get; set; } = string.Empty;
}

public class CreateGenreDto
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}

public class CreateThemeDto
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}

public class CreateMangaDto
{
    public string Title { get; set; } = string.Empty;
    public string AlternativeTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CoverUrl { get; set; } = string.Empty;
    public MangaType Type { get; set; }
    public MangaStatus Status { get; set; }
    public MangaDemographic Demographic { get; set; }
    public MangaFormat Format { get; set; }
    public int? ReleaseYear { get; set; }
    public List<MangaAuthorDto> Authors { get; set; } = [];
    public List<int> GenreIds { get; set; } = [];
    public List<int> ThemeIds { get; set; } = [];
    public List<string> ContentWarnings { get; set; } = [];
}

public class MangaAuthorDto
{
    public int AuthorId { get; set; }
    public string Role { get; set; } = "Story & Art";
}
