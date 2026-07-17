using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class MangaContributorAuthorizationTests
{
    [Theory]
    [InlineData("Admin", false, true)]
    [InlineData("User", true, true)]
    [InlineData("User", false, false)]
    [InlineData("", true, false)]
    public void IsAllowedOnlyForAdminOrMatchingContributor(string role, bool isContributor, bool expected)
    {
        Assert.Equal(expected, MangaContributorAuthorizationService.IsAllowed(role, isContributor));
    }
}
