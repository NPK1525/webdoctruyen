# Complete Advanced Tag Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the complete manga taxonomy in advanced search while keeping every tag name in English and preserving the eight-item author/artist suggestion limit.

**Architecture:** Continue using the existing Genre and Theme APIs shared with manga creation. Make the shared option filter accept an explicit optional limit, call it without a limit for taxonomy tags, and call it with `8` for people autocomplete.

**Tech Stack:** ASP.NET Core Razor, browser JavaScript, Node.js built-in test runner.

## Global Constraints

- Show every available Format, Genre, Theme, and Content tag in the existing scrollable tag panel.
- Genre and Theme must continue using `/api/genre` and `/api/theme`.
- Tag names remain English in Vietnamese and English interface modes.
- Only surrounding interface copy is localized.
- Existing include → exclude → neutral behavior and query serialization remain unchanged.
- Author and artist suggestions remain limited to eight.
- No new API, database table, or duplicate Genre/Theme catalog.

---

### Task 1: Separate Taxonomy and People Result Limits

**Files:**
- Modify: `backend.Tests/js/advanced-search-filters.test.cjs`
- Modify: `backend/wwwroot/js/advanced-search-filters.js`
- Modify: `backend/wwwroot/js/advanced-search.js`

**Interfaces:**
- Consumes: `filterOptions(options, search, labelSelector?, limit?)`
- Produces: an unbounded filtered array when `limit` is omitted and a bounded array when a positive integer limit is supplied.

- [ ] **Step 1: Write failing tests for complete tags and bounded people**

Add these assertions to `backend.Tests/js/advanced-search-filters.test.cjs`:

```js
test('tag filtering returns the complete catalog while people suggestions can be limited', () => {
  const utils = loadUtils();
  const options = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    name: `Tag ${index + 1}`
  }));

  assert.equal(utils.filterOptions(options, '').length, 12);
  assert.equal(utils.filterOptions(options, '', option => option.name, 8).length, 8);
});

test('advanced taxonomy keeps canonical English tag labels', () => {
  assert.match(advancedSearchScript, /name: 'Adaptation'/);
  assert.match(advancedSearchScript, /name: 'Gore'/);
  assert.doesNotMatch(advancedSearchScript, /name: 'Adaptation', i18n:/);
  assert.doesNotMatch(advancedSearchScript, /name: 'Gore', i18n:/);
});
```

Remove Format and Content translation-key expectations from the existing
`advanced search page and dynamic labels are fully localized` test because
tag values are intentionally language-neutral English data.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test backend.Tests\js\advanced-search-filters.test.cjs
```

Expected: FAIL because `filterOptions` still truncates every result to eight,
and the Format/Content metadata still assigns translation keys.

- [ ] **Step 3: Make the option limit explicit**

Change `filterOptions` in `backend/wwwroot/js/advanced-search-filters.js` to:

```js
function filterOptions(
  options,
  search,
  labelSelector = option => option.name,
  limit = null
) {
  const query = String(search || '').trim().toLocaleLowerCase();
  const matches = (Array.isArray(options) ? options : [])
    .filter(option => !query || String(labelSelector(option) || '')
      .toLocaleLowerCase()
      .includes(query));

  return Number.isInteger(limit) && limit > 0
    ? matches.slice(0, limit)
    : matches;
}
```

Keep tag rendering unbounded:

```js
const items = filterOptions(metadata[group], query, optionLabel);
```

Limit author and artist autocomplete explicitly:

```js
const items = filterOptions(available, input.value, person => person.name, 8);
```

- [ ] **Step 4: Keep taxonomy labels in English**

In `backend/wwwroot/js/advanced-search.js`, remove each `i18n` property from
the fixed Format and Content metadata:

```js
format: [
  { value: '1', name: 'Adaptation' },
  { value: '2', name: 'Web Comic' },
  { value: '3', name: 'One-shot' },
  { value: '4', name: 'Comic' },
  { value: '5', name: 'Book' }
],
content: [
  { value: 'Gore', name: 'Gore' },
  { value: 'Sexual Violence', name: 'Sexual Violence' }
]
```

Genre and Theme names already come directly from their shared APIs and need no
new mapping.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```powershell
node --test backend.Tests\js\advanced-search-filters.test.cjs
```

Expected: all tests PASS.

- [ ] **Step 6: Run full regression verification**

Run:

```powershell
$testFiles = Get-ChildItem backend.Tests\js -Filter '*.test.cjs' |
  ForEach-Object { $_.FullName }
node --test $testFiles
dotnet build backend\MangaNPK.csproj -c Release --no-restore
git diff --check
```

Expected: every JavaScript test passes, backend build succeeds with zero
errors, and `git diff --check` reports no whitespace errors.

- [ ] **Step 7: Commit only the implementation files**

```powershell
git add -- backend.Tests/js/advanced-search-filters.test.cjs `
  backend/wwwroot/js/advanced-search-filters.js `
  backend/wwwroot/js/advanced-search.js
git commit -m "fix: show complete advanced search tags"
```
