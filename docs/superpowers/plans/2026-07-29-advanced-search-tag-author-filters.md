# Advanced Search Tag, Author, and Artist Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with checkpoints.

**Goal:** Add a MangaDex-style multi-state tag filter panel plus searchable Authors and Artists filters to the existing advanced search page and API.

**Architecture:** Keep the current `/manga` page and `advanced-search.js` as the state owner. Add a small reusable browser-side filter module for tag state and author/artist selection, then serialize its state into `/api/manga` query parameters. Extend `MangaController.GetMangas` with list parameters and role-aware predicates, preserving legacy singular filters for existing callers.

**Tech Stack:** ASP.NET Core 10, Entity Framework Core, Razor views, vanilla JavaScript, shared CSS variables, Node built-in test runner, xUnit backend tests.

## Global Constraints

- Preserve the existing advanced-search result shape and card rendering.
- Use existing theme variables and Vietnamese/English i18n dictionaries; do not introduce a second color system.
- `Story & Art` matches both Authors and Artists.
- Include values use OR semantics within one tag group and AND semantics between tag groups.
- Exclude values remove manga matching any excluded value.
- Keep legacy `genreId`, `themeId`, and existing search parameters working.
- Use TDD: each new behavior gets a failing test before production code.
- Do not add dependencies.

## File Map

- Create `backend/wwwroot/js/advanced-search-filters.js`: tag state, popover, chip filtering, and searchable multi-select behavior.
- Modify `backend/Views/MangaView/Index.cshtml`: add Filter tags, Authors, and Artists controls with ARIA markup.
- Modify `backend/wwwroot/js/advanced-search.js`: initialize filter metadata, restore URL state, serialize new filters, reset state, and refresh on locale changes.
- Modify `backend/wwwroot/css/style.css`: responsive popover, tag chips, author/artist dropdown, and selected-state styles.
- Modify `backend/Controllers/MangaController.cs`: parse list filters and apply include/exclude and role predicates.
- Create `backend.Tests/js/advanced-search-filters.test.cjs`: browser-module contract and state/query tests.
- Modify `backend.Tests/js/admin-localization.test.cjs` only if shared dictionary parity coverage is the established location; otherwise create `backend.Tests/js/advanced-search-localization.test.cjs`.
- Create or modify backend tests under `backend.Tests/` for `MangaController` filter predicates.
- Modify `backend/wwwroot/locales/vi.json` and `backend/wwwroot/locales/en.json`: all new labels and helper text.

---

### Task 1: Define the filter-state contract with failing JavaScript tests

**Files:**
- Create: `backend.Tests/js/advanced-search-filters.test.cjs`
- Create: `backend/wwwroot/js/advanced-search-filters.js`

**Interfaces:**
- `window.AdvancedSearchFilters.create(options)` returns:
  - `getState()`
  - `setState(state)`
  - `reset()`
  - `getQueryState()`
  - `render()`
- Tag state shape:
  ```js
  {
    tags: {
      format: { include: [], exclude: [] },
      genre: { include: [], exclude: [] },
      theme: { include: [], exclude: [] },
      content: { include: [], exclude: [] }
    },
    authors: [],
    artists: []
  }
  ```

- [ ] **Step 1: Write failing tests**

Cover:
```js
test('cycles a tag neutral -> include -> exclude -> neutral');
test('serializes selected tag and author ids into query state');
test('Story & Art author data is eligible for both author and artist lists');
test('reset clears tags, authors, and artists');
test('search text filters visible tag and person options case-insensitively');
```

The tests should read the module source contract first, then execute pure helper
exports in a minimal DOM harness where practical. Do not test only CSS strings.

- [ ] **Step 2: Run the focused test and verify RED**

Run:
```powershell
node --test --test-reporter=dot backend.Tests/js/advanced-search-filters.test.cjs
```

Expected: failures because the module and public methods do not exist.

- [ ] **Step 3: Implement the minimal state module**

Implement:
```js
function cycleTagState(current) {
  return current === 'neutral' ? 'include'
    : current === 'include' ? 'exclude'
    : 'neutral';
}
```

Use stable IDs for options, escaped text, and `data-state` attributes. Keep
rendering and state serialization deterministic so URL restoration can be tested.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command. Expected: all Task 1 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend.Tests/js/advanced-search-filters.test.cjs backend/wwwroot/js/advanced-search-filters.js
git commit -m "feat: add advanced search filter state module"
```

### Task 2: Add the Filter tags, Authors, and Artists markup and styles

**Files:**
- Modify: `backend/Views/MangaView/Index.cshtml`
- Modify: `backend/wwwroot/css/style.css`
- Modify: `backend.Tests/js/advanced-search-filters.test.cjs`

**Interfaces:**
- Trigger: `#advanced-filter-tags-trigger`
- Popover: `#advanced-filter-tags-panel`
- Tag search: `#advanced-filter-tags-search`
- Tag groups: `#advanced-filter-tags-format`, `#advanced-filter-tags-genre`, `#advanced-filter-tags-theme`, `#advanced-filter-tags-content`
- Author search: `#advanced-author-search`, results `#advanced-author-results`, selected chips `#advanced-author-selected`
- Artist search: `#advanced-artist-search`, results `#advanced-artist-results`, selected chips `#advanced-artist-selected`

- [ ] **Step 1: Add failing markup/style contract tests**

Assert that the view contains:
```js
for (const id of [
  'advanced-filter-tags-trigger',
  'advanced-filter-tags-panel',
  'advanced-filter-tags-search',
  'advanced-author-search',
  'advanced-artist-search'
]) assert.match(view, new RegExp(`id="${id}"`));
assert.match(view, /aria-expanded="false"/);
assert.match(view, /role="listbox"/);
```

Assert responsive selectors exist for the tag panel and author/artist controls.

- [ ] **Step 2: Run the test and verify RED**

```powershell
node --test --test-reporter=dot backend.Tests/js/advanced-search-filters.test.cjs
```

Expected: markup assertions fail.

- [ ] **Step 3: Implement accessible markup and shared styles**

Add the controls inside `#advanced-filters`, preserving the existing sort/type/
demographic/status/year/rating controls. The tag panel should be absolutely
positioned relative to its trigger, have a constrained height, and scroll
internally on small screens. Add `.include`, `.exclude`, and neutral chip
styles using `var(--accent-primary)`, `var(--bg-card)`, `var(--bg-input)`, and
existing border/text variables.

- [ ] **Step 4: Run focused tests and verify GREEN**

Expected: all Task 1 and Task 2 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/Views/MangaView/Index.cshtml backend/wwwroot/css/style.css backend.Tests/js/advanced-search-filters.test.cjs
git commit -m "feat: add advanced search filter controls"
```

### Task 3: Load metadata and wire client-side interactions

**Files:**
- Modify: `backend/wwwroot/js/advanced-search-filters.js`
- Modify: `backend/wwwroot/js/advanced-search.js`
- Modify: `backend/Views/MangaView/Index.cshtml`
- Modify: `backend.Tests/js/advanced-search-filters.test.cjs`

**Interfaces:**
- Metadata endpoints: `GET /api/author`, `GET /api/genre`, `GET /api/theme`.
- `initAdvancedFilterControls(metadata)` creates the module once.
- `buildAdvancedQuery()` adds comma-separated values:
  - `includeGenreIds`, `excludeGenreIds`
  - `includeThemeIds`, `excludeThemeIds`
  - `includeFormats`, `excludeFormats`
  - `includeContent`, `excludeContent`
  - `authorIds`, `artistIds`

- [ ] **Step 1: Add failing integration contract tests**

Assert:
```js
test('advanced search builds all new query parameters');
test('URL state restores selected tags and people on initialization');
test('reset removes new query parameters and refreshes results');
test('clicking outside the tag panel closes it without clearing state');
test('selected author and artist chips can be removed independently');
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --test --test-reporter=dot backend.Tests/js/advanced-search-filters.test.cjs
```

- [ ] **Step 3: Implement metadata loading and event wiring**

Load author, genre, and theme lists in parallel with `Promise.all`. Use
`Story`/`Story & Art` for Authors and `Art`/`Story & Art` for Artists. Search
options are case-insensitive, keyboard navigable, and limited to eight visible
results. Tag changes call `updateAdvancedResetState()` but do not request until
the user presses Search; existing select controls retain their current
change-to-search behavior.

Restore URL state before the first `fetchAdvancedManga()` call. Make
`resetAdvancedFilters()` clear both legacy controls and the new module state.

- [ ] **Step 4: Run focused tests and verify GREEN**

Expected: all focused filter tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/wwwroot/js/advanced-search-filters.js backend/wwwroot/js/advanced-search.js backend/Views/MangaView/Index.cshtml backend.Tests/js/advanced-search-filters.test.cjs
git commit -m "feat: wire advanced search tag and person filters"
```

### Task 4: Extend the Manga API with include/exclude filters

**Files:**
- Modify: `backend/Controllers/MangaController.cs`
- Create or modify: `backend.Tests/MangaSearchFilterTests.cs`

**Interfaces:**
- Add optional query parameters to `GetMangas`:
  ```csharp
  string? includeGenreIds = null,
  string? excludeGenreIds = null,
  string? includeThemeIds = null,
  string? excludeThemeIds = null,
  string? includeFormats = null,
  string? excludeFormats = null,
  string? includeContent = null,
  string? excludeContent = null,
  string? authorIds = null,
  string? artistIds = null
  ```
- Parse comma-separated integer lists with `int.TryParse` and enum lists with
  `Enum.TryParse`, ignoring invalid values rather than throwing a 500.

- [ ] **Step 1: Add failing backend tests**

Using the existing test database/context factory, cover:
```csharp
[Fact] public async Task IncludeGenreIds_UsesOrWithinGroup();
[Fact] public async Task IncludeGenreAndTheme_UsesAndBetweenGroups();
[Fact] public async Task ExcludeThemeIds_RemovesMatchingTitles();
[Fact] public async Task AuthorsIncludeStoryAndStoryArt();
[Fact] public async Task ArtistsIncludeArtAndStoryArt();
[Fact] public async Task InvalidListValuesDoNotReturnServerError();
[Fact] public async Task CountsAndPagesReflectFilteredQuery();
```

- [ ] **Step 2: Run and verify RED**

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~MangaSearchFilterTests --verbosity normal
```

Expected: tests fail because the API does not accept or apply the new query
parameters.

- [ ] **Step 3: Implement parsing and predicates**

Apply predicates before `CountAsync`, sorting, `Skip`, and `Take`:
```csharp
if (includeGenreSet.Count > 0)
    query = query.Where(m => m.MangaGenres.Any(x => includeGenreSet.Contains(x.GenreId)));
if (excludeGenreSet.Count > 0)
    query = query.Where(m => !m.MangaGenres.Any(x => excludeGenreSet.Contains(x.GenreId)));
if (authorSet.Count > 0)
    query = query.Where(m => m.MangaAuthors.Any(x =>
        authorSet.Contains(x.AuthorId) && (x.Role == "Story" || x.Role == "Story & Art")));
if (artistSet.Count > 0)
    query = query.Where(m => m.MangaAuthors.Any(x =>
        artistSet.Contains(x.AuthorId) && (x.Role == "Art" || x.Role == "Story & Art")));
```

Use equivalent predicates for themes, formats, and normalized content warning
tokens. Keep old singular `genreId` and `themeId` predicates unchanged.

- [ ] **Step 4: Run backend tests and verify GREEN**

Run the focused command again, then:
```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --verbosity quiet
```

- [ ] **Step 5: Commit**

```powershell
git add backend/Controllers/MangaController.cs backend.Tests/MangaSearchFilterTests.cs
git commit -m "feat: support advanced manga tag and person filters"
```

### Task 5: Add localization, cache versions, and full verification

**Files:**
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`
- Modify: `backend/Views/MangaView/Index.cshtml`
- Modify: `backend/wwwroot/js/advanced-search.js`
- Create or modify: `backend.Tests/js/advanced-search-localization.test.cjs`

- [ ] **Step 1: Add failing localization tests**

Require both dictionaries to contain:
```js
[
  'search.filterTags',
  'search.includeAny',
  'search.searchTags',
  'search.tagHint',
  'search.dismiss',
  'search.authors',
  'search.artists',
  'search.noAuthorMatches',
  'search.noArtistMatches',
  'search.include',
  'search.exclude'
]
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --test --test-reporter=dot backend.Tests/js/advanced-search-localization.test.cjs
```

- [ ] **Step 3: Add Vietnamese/English strings and locale refresh**

Add `data-i18n` hooks to static labels and make dynamic tag helper text,
empty states, selected chips, and trigger labels refresh on
`manganpk:localechanged`. Bump the `advanced-search.js` and stylesheet query
versions in the view so a hard refresh is not required to receive the new
markup and behavior.

- [ ] **Step 4: Run all verification**

```powershell
node --test backend.Tests/js
dotnet test backend.Tests\MangaNPK.Tests.csproj --configuration Release --no-restore --verbosity quiet
dotnet build backend\MangaNPK.csproj --configuration Release --no-restore
git diff --check
```

Expected: JavaScript tests pass with zero failures, backend tests pass, build
has zero errors and warnings, and `git diff --check` is clean.

- [ ] **Step 5: Commit**

```powershell
git add backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json backend/Views/MangaView/Index.cshtml backend/wwwroot/js/advanced-search.js backend.Tests/js/advanced-search-localization.test.cjs
git commit -m "feat: localize advanced search filters"
```
