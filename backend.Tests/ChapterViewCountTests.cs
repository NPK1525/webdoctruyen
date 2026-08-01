using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using System.Text.Json;
using Xunit;

namespace MangaNPK.Tests;

public class ChapterViewCountTests
{
    [Fact]
    public async Task IncrementViewCount_WithChapter_IncrementsMangaAndChapterOncePerSession()
    {
        await using var context = CreateContext();
        var manga = new Manga { Title = "Manga" };
        var chapter = new Chapter { Manga = manga, ChapterNumber = 1 };
        context.AddRange(manga, chapter);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        Assert.IsType<OkObjectResult>(await controller.IncrementViewCount(manga.Id, chapter.Id));
        Assert.IsType<OkObjectResult>(await controller.IncrementViewCount(manga.Id, chapter.Id));

        Assert.Equal(1, manga.ViewCount);
        Assert.Equal(1, chapter.ViewCount);
    }

    [Fact]
    public async Task IncrementViewCount_WithChapterFromAnotherManga_DoesNotIncrementEitherCounter()
    {
        await using var context = CreateContext();
        var requestedManga = new Manga { Title = "Requested" };
        var otherManga = new Manga { Title = "Other" };
        var otherChapter = new Chapter { Manga = otherManga, ChapterNumber = 2 };
        context.AddRange(requestedManga, otherManga, otherChapter);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        Assert.IsType<BadRequestObjectResult>(
            await controller.IncrementViewCount(requestedManga.Id, otherChapter.Id));
        Assert.Equal(0, requestedManga.ViewCount);
        Assert.Equal(0, otherChapter.ViewCount);
    }

    [Fact]
    public async Task LatestUpdates_UsesTheChaptersOwnViewCount()
    {
        await using var context = CreateContext();
        var manga = new Manga { Title = "Manga", ViewCount = 90 };
        var chapter = new Chapter { Manga = manga, ChapterNumber = 3, ViewCount = 7 };
        context.AddRange(manga, chapter);
        await context.SaveChangesAsync();

        var result = Assert.IsType<ViewResult>(await new UpdatesViewController(context).Index());
        var json = Assert.IsType<string>(result.ViewData["UpdatesJson"]);
        using var document = JsonDocument.Parse(json);

        Assert.Equal(7, document.RootElement[0].GetProperty("viewCount").GetInt32());
    }

    [Fact]
    public void MigrationAssembly_ContainsChapterViewCountMigration()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseSqlServer("Server=(local);Database=MangaNPK_Migration_Test;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using var context = new MangaDbContext(options);

        var migrations = context.GetService<IMigrationsAssembly>().Migrations;

        Assert.Contains("20260802000000_AddChapterViewCount", migrations.Keys);
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase($"chapter-view-count-{Guid.NewGuid()}")
            .Options;
        return new MangaDbContext(options);
    }

    private static MangaController CreateController(MangaDbContext context) => new(context)
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { Session = new TestSession() }
        }
    };

    private sealed class TestSession : ISession
    {
        private readonly Dictionary<string, byte[]> _values = [];
        public bool IsAvailable => true;
        public string Id => "chapter-view-count-test";
        public IEnumerable<string> Keys => _values.Keys;
        public void Clear() => _values.Clear();
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public void Remove(string key) => _values.Remove(key);
        public void Set(string key, byte[] value) => _values[key] = value;
        public bool TryGetValue(string key, out byte[] value) => _values.TryGetValue(key, out value!);
    }
}
