using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public sealed class GenreDeduplicationTests
{
    [Fact]
    public async Task GenresPage_MergesDuplicateGenreNamesAndPreservesMangaLinks()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var context = new MangaDbContext(options);
        var firstManga = new Manga { Title = "First" };
        var secondManga = new Manga { Title = "Second" };
        var canonical = new Genre { Name = "Action", Slug = "action" };
        var duplicate = new Genre { Name = " action ", Slug = "hanh-dong" };
        context.Mangas.AddRange(firstManga, secondManga);
        context.Genres.AddRange(canonical, duplicate);
        await context.SaveChangesAsync();
        context.MangaGenres.AddRange(
            new MangaGenre { MangaId = firstManga.Id, GenreId = canonical.Id },
            new MangaGenre { MangaId = secondManga.Id, GenreId = duplicate.Id });
        await context.SaveChangesAsync();

        var controller = new AdminViewController(context);

        var result = await controller.Genres();

        var view = Assert.IsType<ViewResult>(result);
        var genres = Assert.IsAssignableFrom<List<Genre>>(view.Model);
        var genre = Assert.Single(genres);
        Assert.Equal("Action", genre.Name);
        Assert.Equal(2, await context.MangaGenres.CountAsync(link => link.GenreId == genre.Id));
        Assert.Empty(await context.Genres.Where(item => item.Id == duplicate.Id).ToListAsync());
    }

    [Fact]
    public async Task GenreApi_MergesDuplicateGenreNamesBeforeReturningList()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var context = new MangaDbContext(options);
        var firstManga = new Manga { Title = "First" };
        var secondManga = new Manga { Title = "Second" };
        var canonical = new Genre { Name = "Action", Slug = "action" };
        var duplicate = new Genre { Name = "action", Slug = "hanh-dong" };
        context.Mangas.AddRange(firstManga, secondManga);
        context.Genres.AddRange(canonical, duplicate);
        await context.SaveChangesAsync();
        context.MangaGenres.AddRange(
            new MangaGenre { MangaId = firstManga.Id, GenreId = canonical.Id },
            new MangaGenre { MangaId = secondManga.Id, GenreId = duplicate.Id });
        await context.SaveChangesAsync();

        var controller = new GenreController(context, new GenreDeduplicationService(context));

        var result = await controller.GetGenres();

        var ok = Assert.IsType<OkObjectResult>(result);
        var genres = Assert.IsAssignableFrom<List<Genre>>(ok.Value);
        var genre = Assert.Single(genres);
        Assert.Equal("Action", genre.Name);
        Assert.Equal(2, await context.MangaGenres.CountAsync(link => link.GenreId == genre.Id));
        Assert.Empty(await context.Genres.Where(item => item.Id == duplicate.Id).ToListAsync());
    }
}
