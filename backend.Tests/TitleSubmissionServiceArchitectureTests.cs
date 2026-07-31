using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public sealed class TitleSubmissionServiceArchitectureTests
{
    [Fact]
    public void TitleSubmissionService_UsesTitleSubmissionMangaCreator()
    {
        var parameters = typeof(TitleSubmissionService)
            .GetConstructors()
            .Single()
            .GetParameters();

        Assert.Contains(
            parameters,
            parameter => parameter.ParameterType == typeof(TitleSubmissionMangaCreator));
    }
}
