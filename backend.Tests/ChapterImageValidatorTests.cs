using MangaNPK.Services;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace MangaNPK.Tests;

public class ChapterImageValidatorTests
{
    [Fact]
    public async Task ValidateAsync_AcceptsPngWithMatchingSignature()
    {
        var file = CreateFile("page.png", [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

        var error = await ChapterImageValidator.ValidateAsync([file]);

        Assert.Null(error);
    }

    [Fact]
    public async Task ValidateAsync_RejectsContentThatDoesNotMatchExtension()
    {
        var file = CreateFile("page.png", [0xFF, 0xD8, 0xFF]);

        var error = await ChapterImageValidator.ValidateAsync([file]);

        Assert.Contains("nội dung", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ValidateAsync_RejectsFileOverFifteenMegabytes()
    {
        var file = new FormFile(Stream.Null, 0, ChapterImageValidator.MaxFileSize + 1, "pageFiles", "large.jpg");

        var error = await ChapterImageValidator.ValidateAsync([file]);

        Assert.Contains("15 MB", error);
    }

    [Fact]
    public async Task ValidateAsync_RejectsMoreThanFiveHundredFiles()
    {
        var files = Enumerable.Range(1, ChapterImageValidator.MaxFileCount + 1)
            .Select(index => CreateFile($"{index}.jpg", [0xFF, 0xD8, 0xFF]))
            .Cast<IFormFile>()
            .ToList();

        var error = await ChapterImageValidator.ValidateAsync(files);

        Assert.Contains("500", error);
    }

    [Theory]
    [InlineData("page.jpeg", ".jpg")]
    [InlineData("page.webp", ".webp")]
    public void GetSafeExtension_NormalizesSupportedExtension(string fileName, string expected)
    {
        Assert.Equal(expected, ChapterImageValidator.GetSafeExtension(fileName));
    }

    private static FormFile CreateFile(string fileName, byte[] bytes)
    {
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "pageFiles", fileName);
    }
}
