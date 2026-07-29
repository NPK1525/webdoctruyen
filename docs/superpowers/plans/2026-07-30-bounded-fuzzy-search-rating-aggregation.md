# Bounded Fuzzy Search and Rating Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bound fuzzy-search memory usage at 500 manga while retaining typo matching, and calculate rating count and average in one database query.

**Architecture:** `MangaController` will run a bounded direct-match query and fill unused candidate slots from the most recent manga in the same filtered query. Candidate projection will be extracted into one private method so both stages return identical data. Rating statistics will use a single constant-group aggregate query.

**Tech Stack:** ASP.NET Core MVC, Entity Framework Core, EF Core InMemory provider, xUnit, .NET 10

## Global Constraints

- Fuzzy search must never materialize more than 500 candidates.
- Direct substring matches must be selected before fallback candidates.
- Fallback candidates must inherit all active manga filters and exclude direct candidate IDs.
- Existing `MangaSearchRanking.Score`, sorting, response shape, and pagination remain unchanged.
- Rating average and count must come from one aggregate query.
- Preserve the existing uncommitted advanced-filter changes in `MangaController.cs`.

---

### Task 1: Add failing fuzzy-search and rating-query regression tests

**Files:**
- Create: `backend.Tests/MangaQueryPerformanceTests.cs`
- Modify: `backend.Tests/MangaAdvancedFilterContractTests.cs`

**Interfaces:**
- Consumes: `MangaController.GetMangas(...)`, `MangaDbContext`, and the source contract in `backend/Controllers/MangaController.cs`.
- Produces: regression coverage for the 500-candidate ceiling, typo fallback, filter preservation, and one-query rating aggregation.

- [ ] **Step 1: Add behavior tests for bounded candidates and typo fallback**

Create `backend.Tests/MangaQueryPerformanceTests.cs`:

```csharp
using System.Text.Json;
using MangaNPK.Controllers;
using MangaNPK.Data;
using MangaNPK.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class MangaQueryPerformanceTests
{
    [Fact]
    public async Task FuzzySearch_LimitsMaterializedCandidatesToFiveHundred()
    {
        await using var context = CreateContext();
        context.Mangas.AddRange(Enumerable.Range(1, 600).Select(index => new Manga
        {
            Title = $"Series {index}",
            CreatedAt = DateTime.UtcNow.AddMinutes(-index)
        }));
        await context.SaveChangesAsync();

        var result = await CreateController(context).GetMangas(
            search: "Series",
            fuzzy: true,
            pageSize: 100);

        using var json = SerializeResult(result);
        Assert.Equal(500, json.RootElement.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task FuzzySearch_UsesFilteredFallbackForMinorTypos()
    {
        await using var context = CreateContext();
        context.Mangas.AddRange(
            new Manga
            {
                Title = "Naruto",
                Source = "Local",
                CreatedAt = DateTime.UtcNow
            },
            new Manga
            {
                Title = "Naroto Side Story",
                Source = "MangaDex",
                CreatedAt = DateTime.UtcNow.AddMinutes(-1)
            });
        await context.SaveChangesAsync();

        var result = await CreateController(context).GetMangas(
            search: "Narotu",
            fuzzy: true,
            source: "Local");

        using var json = SerializeResult(result);
        var serialized = json.RootElement.GetRawText();
        Assert.Contains("Naruto", serialized);
        Assert.DoesNotContain("Naroto Side Story", serialized);
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    private static MangaController CreateController(MangaDbContext context) => new(context);

    private static JsonDocument SerializeResult(IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        return JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
    }
}
```

- [ ] **Step 2: Add a source contract test for one-query rating aggregation**

Add to `MangaAdvancedFilterContractTests`:

```csharp
[Fact]
public void MangaDetailAggregatesRatingCountAndAverageInOneQuery()
{
    var source = Read(Path.Combine("Controllers", "MangaController.cs"));

    Assert.Contains(".GroupBy(_ => 1)", source);
    Assert.Contains("Average = group.Average", source);
    Assert.Contains("Count = group.Count()", source);
    Assert.DoesNotContain("CountAsync(r => r.MangaId == id)", source);
}
```

- [ ] **Step 3: Run the new tests and verify they fail for the expected reasons**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName~MangaQueryPerformanceTests|FullyQualifiedName~MangaDetailAggregatesRatingCountAndAverageInOneQuery" --verbosity quiet
```

Expected: the fuzzy ceiling test reports `600` instead of `500`, the typo test does not contain `Naruto`, and the rating contract does not find `.GroupBy(_ => 1)`.

---

### Task 2: Implement bounded two-stage fuzzy candidates

**Files:**
- Modify: `backend/Controllers/MangaController.cs`
- Test: `backend.Tests/MangaQueryPerformanceTests.cs`

**Interfaces:**
- Consumes: the already-filtered `IQueryable<Manga>` and `MangaSearchRanking.Score`.
- Produces: `SelectPickerCandidates(IQueryable<Manga>)` and a candidate list containing at most `FuzzyCandidateLimit` unique manga.

- [ ] **Step 1: Add the candidate limit**

Add beside `_context`:

```csharp
private const int FuzzyCandidateLimit = 500;
```

- [ ] **Step 2: Extract the existing candidate projection**

Add this private instance method before `SortPickerCandidates`:

```csharp
private IQueryable<MangaPickerCandidate> SelectPickerCandidates(IQueryable<Manga> source) =>
    source.AsNoTracking()
        .Select(m => new MangaPickerCandidate
        {
            Id = m.Id,
            Title = m.Title,
            AlternativeTitle = m.AlternativeTitle,
            CoverUrl = m.CoverUrl,
            Type = m.Type,
            ReleaseYear = m.ReleaseYear,
            CreatedAt = m.CreatedAt,
            LatestUpload = m.Chapters.Max(c => (DateTime?)c.UploadedAt),
            RatingAverage = _context.Ratings.Where(r => r.MangaId == m.Id)
                .Select(r => (double?)r.Score).Average() ?? 0,
            FollowCount = _context.UserMangaLibraries.Count(item => item.MangaId == m.Id),
            AuthorNames = m.MangaAuthors.Select(item => item.Author.Name).ToList()
        });
```

- [ ] **Step 3: Replace the unbounded candidate materialization**

Replace the current `candidatesQuery.AsNoTracking().Select(...).ToListAsync()` block with:

```csharp
var directCandidates = await SelectPickerCandidates(
        candidatesQuery
            .OrderByDescending(m => m.CreatedAt)
            .ThenByDescending(m => m.Id)
            .Take(FuzzyCandidateLimit))
    .ToListAsync();

var candidates = directCandidates;
var remainingCandidateSlots = FuzzyCandidateLimit - candidates.Count;
if (remainingCandidateSlots > 0)
{
    var directCandidateIds = directCandidates.Select(candidate => candidate.Id).ToList();
    var fallbackQuery = query;
    if (directCandidateIds.Count > 0)
        fallbackQuery = fallbackQuery.Where(manga => !directCandidateIds.Contains(manga.Id));

    var fallbackCandidates = await SelectPickerCandidates(
            fallbackQuery
                .OrderByDescending(manga => manga.CreatedAt)
                .ThenByDescending(manga => manga.Id)
                .Take(remainingCandidateSlots))
        .ToListAsync();

    candidates.AddRange(fallbackCandidates);
}
```

- [ ] **Step 4: Run fuzzy regression tests**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName~MangaQueryPerformanceTests|FullyQualifiedName~MangaSearchRankingTests|FullyQualifiedName~MangaAdvancedFilterContractTests" --verbosity quiet
```

Expected: the fuzzy ceiling and typo fallback tests pass, candidate count never exceeds 500, and existing ranking/filter tests remain green.

---

### Task 3: Restore one-query rating aggregation

**Files:**
- Modify: `backend/Controllers/MangaController.cs`
- Test: `backend.Tests/MangaAdvancedFilterContractTests.cs`

**Interfaces:**
- Consumes: ratings filtered by `MangaId`.
- Produces: nullable `ratingStats` with `Average` and `Count` from one aggregate SQL query.

- [ ] **Step 1: Replace the two rating queries**

Replace `ratingCount`, `ratingAvg`, and the constructed `ratingStats` with:

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

- [ ] **Step 2: Run the rating contract and manga tests**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --filter "FullyQualifiedName~MangaDetailAggregatesRatingCountAndAverageInOneQuery|FullyQualifiedName~MangaQueryPerformanceTests|FullyQualifiedName~MangaListContractsTests" --verbosity quiet
```

Expected: all selected tests pass.

- [ ] **Step 3: Run the complete backend suite and Release build**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --configuration Release --no-restore --verbosity quiet
dotnet build backend/MangaNPK.csproj --configuration Release --no-restore
```

Expected: all backend tests pass and the Release build completes with zero errors.

- [ ] **Step 4: Review and commit only the intended files**

Review:

```powershell
git diff --check
git diff -- backend/Controllers/MangaController.cs backend.Tests/MangaQueryPerformanceTests.cs backend.Tests/MangaAdvancedFilterContractTests.cs
```

Commit:

```powershell
git add -- backend/Controllers/MangaController.cs backend.Tests/MangaQueryPerformanceTests.cs backend.Tests/MangaAdvancedFilterContractTests.cs
git commit -m "perf: bound fuzzy search and aggregate ratings once"
```
