using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class UserIdentityUniquenessTests
{
    [Fact]
    public void UserModel_ExposesNormalizedIdentityFieldsAndUniqueIndexes()
    {
        using var context = CreateContext();
        var entity = context.Model.FindEntityType(typeof(User))!;

        Assert.NotNull(entity.FindProperty(nameof(User.NormalizedUsername)));
        Assert.NotNull(entity.FindProperty(nameof(User.NormalizedEmail)));

        var indexes = entity.GetIndexes().Where(index => index.IsUnique).ToList();
        Assert.Contains(indexes, index => index.Properties.Select(property => property.Name)
            .SequenceEqual([nameof(User.NormalizedUsername)]));
        Assert.Contains(indexes, index => index.Properties.Select(property => property.Name)
            .SequenceEqual([nameof(User.NormalizedEmail)]));
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }
}
