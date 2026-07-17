using System.Globalization;
using System.Text;

namespace MangaNPK.Services;

public static class MangaSearchRanking
{
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var decomposed = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark) continue;
            builder.Append(character is 'đ' ? 'd' : character);
        }
        return string.Join(' ', builder.ToString().Normalize(NormalizationForm.FormC)
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    public static int Score(string query, params string?[] candidates)
    {
        var normalizedQuery = Normalize(query);
        if (normalizedQuery.Length == 0) return 0;
        var best = 0;
        foreach (var raw in candidates)
        {
            var candidate = Normalize(raw);
            if (candidate.Length == 0) continue;
            if (candidate == normalizedQuery) best = Math.Max(best, 1000);
            else if (candidate.StartsWith(normalizedQuery, StringComparison.Ordinal)) best = Math.Max(best, 850);
            else if (candidate.Contains(normalizedQuery, StringComparison.Ordinal)) best = Math.Max(best, 750);
            else if (candidate.Split(' ').Any(token => token.StartsWith(normalizedQuery, StringComparison.Ordinal))) best = Math.Max(best, 700);
            else
            {
                var distance = Levenshtein(normalizedQuery, candidate, 2);
                if (distance <= 2) best = Math.Max(best, 600 - distance * 50);
            }
        }
        return best;
    }

    private static int Levenshtein(string left, string right, int limit)
    {
        if (Math.Abs(left.Length - right.Length) > limit) return limit + 1;
        var previous = Enumerable.Range(0, right.Length + 1).ToArray();
        var current = new int[right.Length + 1];
        for (var i = 1; i <= left.Length; i++)
        {
            current[0] = i;
            var rowMinimum = current[0];
            for (var j = 1; j <= right.Length; j++)
            {
                var cost = left[i - 1] == right[j - 1] ? 0 : 1;
                current[j] = Math.Min(Math.Min(current[j - 1] + 1, previous[j] + 1), previous[j - 1] + cost);
                rowMinimum = Math.Min(rowMinimum, current[j]);
            }
            if (rowMinimum > limit) return limit + 1;
            (previous, current) = (current, previous);
        }
        return previous[right.Length];
    }
}
