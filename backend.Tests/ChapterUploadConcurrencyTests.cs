using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class ChapterUploadConcurrencyTests
{
    [Fact]
    public void Model_HasUniqueFilteredIndexForLocalChapterNumber()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseSqlServer("Server=(localdb)\\mssqllocaldb;Database=ModelOnly")
            .Options;
        using var context = new MangaDbContext(options);

        var index = context.Model.FindEntityType(typeof(Chapter))!.GetIndexes()
            .SingleOrDefault(candidate => candidate.Properties.Select(property => property.Name)
                .SequenceEqual([nameof(Chapter.MangaId), nameof(Chapter.ChapterNumber)]));

        Assert.NotNull(index);
        Assert.True(index!.IsUnique);
        Assert.Equal("[Source] = 'Local'", index.GetFilter());
    }

    [Fact]
    public async Task TryCleanupAsync_StillDeletesFilesWhenRollbackFails()
    {
        var deleteCalled = false;
        var loggedExceptions = new List<Exception>();

        await ChapterUploadCleanup.TryCleanupAsync(
            () => throw new InvalidOperationException("rollback failed"),
            () => deleteCalled = true,
            exception => loggedExceptions.Add(exception));

        Assert.True(deleteCalled);
        Assert.Single(loggedExceptions);
    }

    [Fact]
    public async Task TryCleanupAsync_SwallowsDeleteFailureAndLogsIt()
    {
        var loggedExceptions = new List<Exception>();

        await ChapterUploadCleanup.TryCleanupAsync(
            () => Task.CompletedTask,
            () => throw new IOException("delete failed"),
            exception => loggedExceptions.Add(exception));

        Assert.Single(loggedExceptions);
    }
}
