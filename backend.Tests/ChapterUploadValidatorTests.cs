using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class ChapterUploadValidatorTests
{
    [Fact]
    public void ParsePageUrls_AcceptsHttpHttpsAndRootRelativeUrls()
    {
        var input = "https://cdn.test/1.jpg\nhttp://cdn.test/2.jpg\n/uploads/3.jpg";

        var result = ChapterUploadValidator.ParsePageUrls(input);

        Assert.Equal(3, result.Urls.Count);
        Assert.Null(result.Error);
    }

    [Fact]
    public void ParsePageUrls_RejectsUnsupportedUrl()
    {
        var result = ChapterUploadValidator.ParsePageUrls("javascript:alert(1)");

        Assert.Empty(result.Urls);
        Assert.Contains("không hợp lệ", result.Error);
    }

    [Fact]
    public void ValidateHasPages_RejectsEmptyChapter()
    {
        var error = ChapterUploadValidator.ValidateHasPages(0, 0);

        Assert.Contains("ít nhất một trang", error);
    }

    [Fact]
    public void ValidateHasPages_AcceptsUploadedFileOrUrl()
    {
        Assert.Null(ChapterUploadValidator.ValidateHasPages(1, 0));
        Assert.Null(ChapterUploadValidator.ValidateHasPages(0, 1));
    }
}
