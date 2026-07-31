using MangaNPK.Controllers;
using MangaNPK.Filters;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace MangaNPK.Tests;

public sealed class ReportCommandArchitectureTests
{
    [Fact]
    public void ReportsController_DelegatesModerationToCommandHandler()
    {
        var parameters = typeof(ReportsController)
            .GetConstructors()
            .Single()
            .GetParameters();

        Assert.Contains(
            parameters,
            parameter => parameter.ParameterType == typeof(IReportCommandHandler));
    }

    [Fact]
    public void UpdateStatus_KeepsPatchRouteAndAdminProtection()
    {
        var method = typeof(ReportsController).GetMethod(
            nameof(ReportsController.UpdateStatus));
        Assert.NotNull(method);

        var patch = Assert.Single(
            method!.GetCustomAttributes(typeof(HttpPatchAttribute), false)
                .Cast<HttpPatchAttribute>());
        Assert.Equal("{id:int}", patch.Template);
        Assert.Single(
            method.GetCustomAttributes(typeof(RequireAdminAttribute), false));
    }
}
