using MangaNPK.Contracts.Admin;
using MangaNPK.Controllers;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace MangaNPK.Tests;

public sealed class DesignPatternCompatibilityContractTests
{
    [Fact]
    public void ReportModeration_RouteAndDtoRemainStable()
    {
        var method = typeof(ReportsController).GetMethod(
            nameof(ReportsController.UpdateStatus));
        Assert.NotNull(method);

        var patch = Assert.Single(
            method!.GetCustomAttributes(typeof(HttpPatchAttribute), false)
                .Cast<HttpPatchAttribute>());
        Assert.Equal("{id:int}", patch.Template);

        var parameters = method.GetParameters();
        Assert.Equal(typeof(int), parameters[0].ParameterType);
        Assert.Equal(typeof(ReportsController.UpdateReportDto), parameters[1].ParameterType);
    }

    [Fact]
    public void MangaCreation_RequestContractRemainsStable()
    {
        Assert.Equal(
            typeof(string),
            typeof(CreateMangaDto).GetProperty(nameof(CreateMangaDto.Title))!.PropertyType);
        Assert.Equal(
            typeof(List<MangaAuthorDto>),
            typeof(CreateMangaDto).GetProperty(nameof(CreateMangaDto.Authors))!.PropertyType);
        Assert.Equal(
            typeof(List<int>),
            typeof(CreateMangaDto).GetProperty(nameof(CreateMangaDto.GenreIds))!.PropertyType);
        Assert.Equal(
            typeof(List<int>),
            typeof(CreateMangaDto).GetProperty(nameof(CreateMangaDto.ThemeIds))!.PropertyType);
    }
}
