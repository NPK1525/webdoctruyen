# Bounded Fuzzy Search and Rating Aggregation Design

## Goal

Keep fuzzy manga search useful for misspelled queries without loading the
entire filtered catalog into application memory, and fetch manga rating count
and average with one database round trip.

## Fuzzy Search Design

Fuzzy search uses the already-filtered manga query as its source and builds a
bounded candidate set:

1. Query SQL for direct title, alternative-title, or author-name matches using
   `LIKE`.
2. Take at most 500 direct candidates.
3. If fewer than 500 direct candidates are found, supplement them with recent
   manga from the same filtered query, excluding direct candidate IDs.
4. Stop once the combined candidate set reaches 500.
5. Calculate the existing `MangaSearchRanking.Score` in memory, discard
   zero-score candidates, sort, and paginate the bounded result.

Both candidate queries inherit all active source, chapter-state, tag, content,
author, and artist filters. Empty search text does not enter the fuzzy path and
continues through normal database pagination.

This approach preserves typo tolerance for the current catalog and provides a
strict memory ceiling as the catalog grows. On very large catalogs, an obscure
old title with no direct substring match may fall outside the recent fallback;
a dedicated trigram or external search index is intentionally deferred.

## Rating Aggregation Design

The manga detail endpoint performs one aggregate query:

```csharp
var ratingStats = await _context.Ratings
    .AsNoTracking()
    .Where(r => r.MangaId == id)
    .GroupBy(_ => 1)
    .Select(group => new
    {
        Average = group.Average(r => r.Score),
        Count = group.Count()
    })
    .FirstOrDefaultAsync();
```

Grouping by a constant is used only to return `Average` and `Count` in a single
SQL result. A manga without ratings continues to return zero for both values.

## Correctness and Safety

- Never call `ToListAsync` on an unbounded fuzzy candidate query.
- Never combine more than 500 fuzzy candidates in memory.
- Never include the same manga twice when direct and fallback results overlap.
- Preserve every advanced-search filter in both candidate stages.
- Preserve existing fuzzy ranking, sorting, response shape, and pagination.
- Preserve existing rating response values and the no-ratings behavior.

## Tests

- Verify the fuzzy candidate limit is applied before materialization.
- Verify direct candidates are supplemented without duplicates.
- Verify active filters apply to fallback candidates.
- Verify typo scoring still operates on fallback candidates.
- Verify rating count and average are produced by one aggregate query shape.
- Run the complete backend tests and a Release build.

## Out of Scope

- Adding SQL Server Full-Text Search.
- Adding trigram tables, Elasticsearch, or Meilisearch.
- Changing the public search or manga-detail response contracts.
- Changing the fuzzy scoring algorithm.
