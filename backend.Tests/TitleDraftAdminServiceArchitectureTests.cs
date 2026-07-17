using MangaNPK.Controllers;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class TitleDraftAdminServiceArchitectureTests
{
    [Fact]
    public void TitleDraftController_DelegatesPersistenceToAdminService()
    {
        var parameters = typeof(AdminTitleDraftController).GetConstructors().Single().GetParameters();
        Assert.Single(parameters);
        Assert.Equal(typeof(TitleDraftAdminService), parameters[0].ParameterType);
    }
}
