using MangaNPK.Controllers;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class CatalogAdminServiceArchitectureTests
{
    [Fact]
    public void CatalogController_DelegatesPersistenceToCatalogAdminService()
    {
        var constructor = typeof(AdminCatalogController).GetConstructors().Single();
        Assert.Contains(constructor.GetParameters(), parameter => parameter.ParameterType == typeof(CatalogAdminService));
    }
}
