using MangaNPK.Models;
using Xunit;

namespace MangaNPK.Tests;

public class UserLockingModelTests
{
    [Fact]
    public void NewUser_IsUnlockedByDefault()
    {
        var user = new User();

        Assert.False(user.IsLocked);
    }
}
