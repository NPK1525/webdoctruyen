using MangaNPK.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MangaNPK.Tests;

public sealed class DesignPatternDependencyInjectionTests
{
    [Fact]
    public void ServiceGraph_ResolvesAllPatternComponents()
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
                builder.UseEnvironment("Testing"));
        using var scope = factory.Services.CreateScope();
        var provider = scope.ServiceProvider;

        Assert.IsType<CachedMangaDexChapterPageService>(
            provider.GetRequiredService<IMangaDexChapterPageService>());
        Assert.IsType<LoggingMangaDexProxy>(
            provider.GetRequiredService<IMangaDexService>());
        Assert.IsType<UpdateReportStatusCommandHandler>(
            provider.GetRequiredService<IReportCommandHandler>());
        Assert.NotNull(provider.GetRequiredService<CatalogMangaCreator>());
        Assert.NotNull(provider.GetRequiredService<TitleDraftMangaCreator>());
        Assert.NotNull(provider.GetRequiredService<TitleSubmissionMangaCreator>());
        Assert.NotNull(provider.GetRequiredService<MangaDexMangaCreator>());
    }
}
