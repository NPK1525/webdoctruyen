using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Xunit;

namespace MangaNPK.Tests;

public class MangaContributorModelTests
{
    [Fact]
    public void ContributorStoresOwnershipAndGrantAuditFields()
    {
        var grantedAt = new DateTime(2026, 7, 14, 12, 0, 0, DateTimeKind.Utc);
        var contributor = new MangaContributor
        {
            MangaId = 12,
            UserId = 8,
            GrantedAt = grantedAt,
            GrantedByUserId = 1
        };

        Assert.Equal(12, contributor.MangaId);
        Assert.Equal(8, contributor.UserId);
        Assert.Equal(grantedAt, contributor.GrantedAt);
        Assert.Equal(1, contributor.GrantedByUserId);
    }

    [Fact]
    public void ContextConfiguresOneContributorPerUserAndManga()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=MangaNPK_ModelTest;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;

        using var context = new MangaDbContext(options);
        var entity = context.Model.FindEntityType(typeof(MangaContributor));

        Assert.NotNull(entity);
        Assert.Contains(entity!.GetIndexes(), index =>
            index.IsUnique
            && index.Properties.Select(property => property.Name)
                .SequenceEqual(new[] { nameof(MangaContributor.MangaId), nameof(MangaContributor.UserId) }));
    }
}
