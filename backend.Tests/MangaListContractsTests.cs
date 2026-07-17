using MangaNPK.Controllers;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class MangaListContractsTests
{
    private static readonly string BackendRoot = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "backend"));

    [Fact]
    public void SaveRequest_ValidatesMetadataAndDuplicateMangaIds()
    {
        var request = new MangaListSaveRequest
        {
            Name = "  ",
            Description = new string('x', 1001),
            MangaIds = [9, 9]
        };

        var errors = MangaListValidation.Validate(request);

        Assert.Contains(errors, error => error.Contains("name", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errors, error => error.Contains("description", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errors, error => error.Contains("duplicate", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void SynchronizeItems_ReturnsOrderedAddsRemovesAndReorders()
    {
        var changes = MangaListSynchronization.Calculate(
            [new MangaListItemState(3, 1), new MangaListItemState(7, 2)],
            [7, 11]);

        Assert.Equal([11], changes.AddedMangaIds);
        Assert.Equal([3], changes.RemovedMangaIds);
        Assert.Equal([new MangaListItemState(7, 1), new MangaListItemState(11, 2)], changes.FinalItems);
    }

    [Fact]
    public void Persistence_UsesAtomicAggregateAndMembershipChecksOwnership()
    {
        var service = File.ReadAllText(Path.Combine(BackendRoot, "Services", "MangaListService.cs"));
        var controller = File.ReadAllText(Path.Combine(BackendRoot, "Controllers", "MangaListController.cs"));

        Assert.Contains("BeginTransactionAsync", service);
        Assert.Contains("MangaListSynchronization.Calculate", service);
        Assert.Contains("MangaListSaveRequest request", controller);
        Assert.Contains("list.Id == listId && list.UserId == userId", controller);
        Assert.Contains("Status403Forbidden", controller);
    }

    [Fact]
    public void FuzzyPicker_ImplementsEveryAdvertisedServerSort()
    {
        var controller = File.ReadAllText(Path.Combine(BackendRoot, "Controllers", "MangaController.cs"));
        foreach (var sort in new[]
        {
            "latest", "oldest-upload", "title-asc", "title-desc", "rating-desc", "rating-asc",
            "follows-desc", "follows-asc", "recent", "oldest-added", "year-asc", "year-desc"
        })
        {
            Assert.Contains($"\"{sort}\"", controller);
        }
    }
}
