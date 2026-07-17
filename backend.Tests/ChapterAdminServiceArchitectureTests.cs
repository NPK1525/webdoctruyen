using MangaNPK.Controllers;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class ChapterAdminServiceArchitectureTests
{
    [Fact]
    public void ChapterController_DelegatesPersistenceToChapterAdminService()
    {
        var constructor = typeof(AdminChapterController).GetConstructors().Single();

        Assert.Contains(constructor.GetParameters(), parameter =>
            parameter.ParameterType == typeof(ChapterAdminService));
    }
}
