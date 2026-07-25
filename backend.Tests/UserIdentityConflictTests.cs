using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class UserIdentityConflictTests
{
    [Theory]
    [InlineData(2601, "IX_Users_NormalizedUsername", "username")]
    [InlineData(2627, "IX_Users_NormalizedEmail", "email")]
    public void SqlServerDuplicateKey_IsMappedToIdentityField(int number, string indexName, string expectedField)
    {
        var conflict = UserIdentityConflict.FromSqlServer(number, $"Cannot insert duplicate key in {indexName}.");

        Assert.NotNull(conflict);
        Assert.Equal(expectedField, conflict!.Field);
    }

    [Fact]
    public void UnrelatedSqlError_IsNotMapped()
    {
        Assert.Null(UserIdentityConflict.FromSqlServer(547, "Foreign key violation."));
    }
}
