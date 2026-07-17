using MangaNPK.Services;

static void AssertEqual(string expected, string actual, string name)
{
    if (!string.Equals(expected, actual, StringComparison.Ordinal))
    {
        throw new Exception($"{name}: expected '{expected}', got '{actual}'");
    }
}

const string uuid = "391b0423-d847-456f-aff0-8b0cfc03066b";

AssertEqual(uuid, MangaDexIdParser.ExtractMangaId(uuid), "plain uuid");
AssertEqual(uuid, MangaDexIdParser.ExtractMangaId($"https://mangadex.org/title/{uuid}/sample-title"), "title url");
AssertEqual(uuid, MangaDexIdParser.ExtractMangaId($"https://mangadex.org/title/{uuid}"), "title url without slug");

Console.WriteLine("MangaDex import parser tests passed.");
