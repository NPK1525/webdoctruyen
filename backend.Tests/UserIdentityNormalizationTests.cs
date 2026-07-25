using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class UserIdentityNormalizationTests
{
    [Fact]
    public async Task SaveChanges_NormalizesIdentityFieldsOnInsertAndUpdate()
    {
        await using var context = CreateContext();
        var user = new User
        {
            Username = "  MiXeD_User  ",
            Email = "  Mixed@Example.Test  ",
            PasswordHash = "hash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        Assert.Equal("MIXED_USER", user.NormalizedUsername);
        Assert.Equal("MIXED@EXAMPLE.TEST", user.NormalizedEmail);

        user.Username = "  Renamed  ";
        user.Email = " Renamed@Example.Test ";
        await context.SaveChangesAsync();

        Assert.Equal("RENAMED", user.NormalizedUsername);
        Assert.Equal("RENAMED@EXAMPLE.TEST", user.NormalizedEmail);
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }
}
