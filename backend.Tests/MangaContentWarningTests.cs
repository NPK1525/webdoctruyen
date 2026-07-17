using MangaNPK.Services;
using Xunit;

namespace MangaNPK.Tests;

public class MangaContentWarningTests
{
    [Fact]
    public void Normalize_KeepsOnlySupportedDistinctValues()
    {
        var result = MangaContentWarning.Normalize(["Gore", "gore", "Sexual Violence", "unknown"]);
        Assert.Equal(["Gore", "Sexual Violence"], result);
    }
}
