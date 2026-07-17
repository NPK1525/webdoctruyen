using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class MangaSearchRankingTests
{
    [Theory]
    [InlineData("Đôrêmon", "doremon")]
    [InlineData("Tôi Là Nhện Đấy", "toi la nhen day")]
    public void Normalize_RemovesVietnameseDiacritics(string input, string expected)
    {
        Assert.Equal(expected, MangaSearchRanking.Normalize(input));
    }

    [Fact]
    public void Score_RanksExactThenPartialThenMinorTypo()
    {
        var exact = MangaSearchRanking.Score("naruto", "Naruto");
        var partial = MangaSearchRanking.Score("nar", "Naruto");
        var typo = MangaSearchRanking.Score("naroto", "Naruto");
        var unrelated = MangaSearchRanking.Score("naruto", "One Piece");

        Assert.True(exact > partial);
        Assert.True(partial > unrelated);
        Assert.True(typo > unrelated);
    }
}
