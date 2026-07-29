using System.Text.Json;
using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class MangaQueryPerformanceTests
{
    [Fact]
    public async Task FuzzySearch_LimitsMaterializedCandidatesToFiveHundred()
    {
        await using var context = CreateContext();
        context.Mangas.AddRange(Enumerable.Range(1, 600).Select(index => new Manga
        {
            Title = $"Series {index}",
            CreatedAt = DateTime.UtcNow.AddMinutes(-index)
        }));
        await context.SaveChangesAsync();

        var result = await CreateController(context).GetMangas(
            search: "Series",
            fuzzy: true,
            pageSize: 100);

        using var json = SerializeResult(result);
        Assert.Equal(500, json.RootElement.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task FuzzySearch_UsesFilteredFallbackForMinorTypos()
    {
        await using var context = CreateContext();
        context.Mangas.AddRange(
            new Manga
            {
                Title = "Naruto",
                Source = "Local",
                CreatedAt = DateTime.UtcNow
            },
            new Manga
            {
                Title = "Naroto Side Story",
                Source = "MangaDex",
                CreatedAt = DateTime.UtcNow.AddMinutes(-1)
            });
        await context.SaveChangesAsync();

        var result = await CreateController(context).GetMangas(
            search: "Narotu",
            fuzzy: true,
            source: "Local");

        using var json = SerializeResult(result);
        var serialized = json.RootElement.GetRawText();
        Assert.Contains("Naruto", serialized);
        Assert.DoesNotContain("Naroto Side Story", serialized);
    }

    [Fact]
    public async Task FuzzySearch_DoesNotDuplicateDirectMatchesInFallback()
    {
        await using var context = CreateContext();
        context.Mangas.AddRange(
            new Manga { Title = "Naruto", CreatedAt = DateTime.UtcNow },
            new Manga { Title = "One Piece", CreatedAt = DateTime.UtcNow.AddMinutes(-1) });
        await context.SaveChangesAsync();

        var result = await CreateController(context).GetMangas(
            search: "Naruto",
            fuzzy: true);

        using var json = SerializeResult(result);
        Assert.Equal(1, json.RootElement.GetProperty("totalCount").GetInt32());
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    private static MangaController CreateController(MangaDbContext context) => new(context);

    private static JsonDocument SerializeResult(IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        return JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
    }
}
