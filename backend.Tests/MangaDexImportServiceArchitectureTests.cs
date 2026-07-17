using MangaNPK.Controllers;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class MangaDexImportServiceArchitectureTests
{
    [Fact]
    public void MangaDexController_DelegatesToImportService()
    {
        var parameters = typeof(AdminMangaDexController).GetConstructors().Single().GetParameters();
        Assert.Single(parameters);
        Assert.Equal(typeof(MangaDexImportService), parameters[0].ParameterType);
    }
}
