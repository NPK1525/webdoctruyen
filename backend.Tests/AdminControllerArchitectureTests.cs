using System.Reflection;
using MangaNPK.Controllers;
using MangaNPK.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Xunit;

namespace MangaNPK.Tests;

public class AdminControllerArchitectureTests
{
    private static readonly string[] ExpectedEndpoints =
    {
        "DELETE author/{id:int}",
        "DELETE genre/{id:int}",
        "DELETE manga/{id}",
        "GET chapter/{id:int}",
        "GET manga/{mangaId:int}/chapters",
        "GET title-drafts",
        "GET title-drafts/{id}",
        "POST author",
        "POST chapter",
        "POST genre",
        "POST manga",
        "POST mangadex/import",
        "POST mangadex/preview",
        "POST theme",
        "POST title-drafts",
        "POST title-drafts/{id}/approve",
        "POST title-drafts/{id}/reject",
        "PUT chapter/{id:int}",
        "PUT author/{id:int}",
        "PUT genre/{id:int}",
        "PUT manga/{id}",
        "PUT title-drafts/{id}"
    };

    [Fact]
    public void AdminEndpointContract_IsCharacterizedExactlyOnce()
    {
        var endpoints = GetAdminControllerTypes()
            .SelectMany(type => type.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly))
            .SelectMany(method => method.GetCustomAttributes<HttpMethodAttribute>().Select(attribute => new
            {
                Method = attribute.HttpMethods.Single(),
                Route = attribute.Template ?? string.Empty
            }))
            .Select(endpoint => $"{endpoint.Method} {endpoint.Route}")
            .OrderBy(endpoint => endpoint, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(ExpectedEndpoints.OrderBy(endpoint => endpoint, StringComparer.Ordinal), endpoints);
        Assert.Equal(endpoints.Length, endpoints.Distinct(StringComparer.Ordinal).Count());
    }

    [Fact]
    public void AdminEndpoints_AreSplitByResponsibility()
    {
        var assembly = typeof(AdminCatalogController).Assembly;
        var expectedNames = new[]
        {
            "MangaNPK.Controllers.AdminCatalogController",
            "MangaNPK.Controllers.AdminChapterController",
            "MangaNPK.Controllers.AdminMangaDexController",
            "MangaNPK.Controllers.AdminTitleDraftController"
        };

        var controllerTypes = expectedNames
            .Select(name => assembly.GetType(name))
            .ToArray();

        Assert.DoesNotContain(controllerTypes, type => type is null);
        foreach (var type in controllerTypes.Cast<Type>())
        {
            Assert.True(typeof(ControllerBase).IsAssignableFrom(type));
            Assert.NotNull(type.GetCustomAttribute<ApiControllerAttribute>());
            Assert.Equal("api/admin", type.GetCustomAttribute<RouteAttribute>()?.Template);
            Assert.NotNull(type.GetCustomAttribute<RequireAdminAttribute>());
        }
    }

    [Theory]
    [InlineData("CreateAuthorDto")]
    [InlineData("CreateGenreDto")]
    [InlineData("CreateThemeDto")]
    [InlineData("CreateMangaDto")]
    [InlineData("MangaAuthorDto")]
    [InlineData("CreateChapterDto")]
    [InlineData("UpdateChapterDto")]
    [InlineData("MangaDexImportRequest")]
    [InlineData("SaveTitleDraftDto")]
    [InlineData("RejectTitleDraftDto")]
    public void AdminRequestDtos_AreSeparatedFromControllers(string typeName)
    {
        var assembly = typeof(AdminCatalogController).Assembly;
        Assert.NotNull(assembly.GetType($"MangaNPK.Contracts.Admin.{typeName}"));
        Assert.Null(assembly.GetType($"MangaNPK.Controllers.{typeName}"));
    }

    private static IEnumerable<Type> GetAdminControllerTypes()
    {
        return typeof(AdminCatalogController).Assembly.GetTypes()
            .Where(type => !type.IsAbstract && typeof(ControllerBase).IsAssignableFrom(type))
            .Where(type =>
            {
                var route = type.GetCustomAttribute<RouteAttribute>()?.Template;
                if (string.Equals(route, "api/admin", StringComparison.OrdinalIgnoreCase)) return true;
                if (!string.Equals(route, "api/[controller]", StringComparison.OrdinalIgnoreCase)) return false;
                return string.Equals(type.Name, "AdminController", StringComparison.Ordinal);
            });
    }
}
