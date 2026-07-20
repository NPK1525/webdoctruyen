using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class PasswordResetModelTests
{
    [Fact]
    public void PasswordResetRequest_ContainsSecurityState()
    {
        var type = typeof(PasswordResetRequest);

        foreach (var property in new[]
        {
            "UserId", "OtpHash", "ExpiresAt", "FailedAttempts",
            "ResetTokenHash", "ResetTokenExpiresAt", "ConsumedAt"
        })
        {
            Assert.NotNull(type.GetProperty(property));
        }
    }

    [Fact]
    public void Context_ConfiguresPasswordResetLookupAndCascadeDelete()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=MangaNPK_PasswordResetModelTest;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;

        using var context = new MangaDbContext(options);
        var entity = context.Model.FindEntityType(typeof(PasswordResetRequest));

        Assert.NotNull(entity);
        Assert.Contains(entity!.GetIndexes(), index =>
            index.Properties.Select(property => property.Name)
                .SequenceEqual(new[] { "UserId", "CreatedAt" }));
        Assert.Equal(DeleteBehavior.Cascade, entity.GetForeignKeys().Single().DeleteBehavior);
    }
}
