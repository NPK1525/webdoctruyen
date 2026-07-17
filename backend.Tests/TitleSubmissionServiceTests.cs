using MangaNPK.Models;
using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class TitleSubmissionServiceTests
{
    [Fact]
    public void ValidateRejectsDuplicateAuthorRoleRows()
    {
        var payload = new TitleSubmissionPayload
        {
            Title = "Test title",
            Description = "A description",
            CoverUrl = "https://cdn.test/cover.jpg",
            Authors =
            [
                new TitleAuthorInput { Name = "Author", Role = "Story" },
                new TitleAuthorInput { Name = " author ", Role = "Story" }
            ]
        };

        var error = TitleSubmissionValidation.Validate(payload, requireCover: true);

        Assert.Contains("trùng", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAcceptsExistingOrProposedAuthorsWithSupportedRoles()
    {
        var payload = new TitleSubmissionPayload
        {
            Title = "Test title",
            Description = "A description",
            CoverUrl = "https://cdn.test/cover.jpg",
            Authors =
            [
                new TitleAuthorInput { AuthorId = 4, Role = "Story" },
                new TitleAuthorInput { Name = "New Author", Role = "Art" }
            ]
        };

        Assert.Null(TitleSubmissionValidation.Validate(payload, requireCover: true));
    }
}
