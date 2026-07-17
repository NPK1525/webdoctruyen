# Common Library Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract local library and reading-history storage from `common.js` without changing any page UI or persisted data.

**Architecture:** Preserve the current global-script architecture. Load `common-library.js` immediately before `common.js` on every consuming Razor view, retaining all function names, storage keys, object fields, and custom events.

**Tech Stack:** JavaScript, Node.js built-in test runner, ASP.NET Core Razor views, .NET 10.

## Global Constraints

- Preserve every visible UI element, text, CSS class, HTML ID, and navigation behavior.
- Preserve all local storage keys, stored object fields, status values, and custom event names.
- Do not introduce ES modules, bundling, packages, or runtime dependencies.
- Do not commit because the shared worktree contains user-owned changes.

---

### Task 1: Lock the common-library contract

**Files:**
- Create: `backend.Tests/js/common-library-contract.test.cjs`

**Interfaces:**
- Consumes: the nine Razor views that load `/js/common.js` and `backend/wwwroot/js/common.js`.
- Produces: a failing contract requiring `common-library.js`, correct load order, and extracted function ownership.

- [ ] **Step 1: Write the failing contract test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const viewPaths = [
  'Views/AdminView/Index.cshtml',
  'Views/ChapterView/Read.cshtml',
  'Views/HistoryView/Index.cshtml',
  'Views/Home/Index.cshtml',
  'Views/LibraryView/Index.cshtml',
  'Views/MangaView/Detail.cshtml',
  'Views/MangaView/Index.cshtml',
  'Views/RecentlyAddedView/Index.cshtml',
  'Views/UpdatesView/Index.cshtml'
];
const modulePath = path.join(root, 'wwwroot/js/common-library.js');
const coordinator = fs.readFileSync(path.join(root, 'wwwroot/js/common.js'), 'utf8');

test('every common consumer loads common-library first', () => {
  assert.ok(fs.existsSync(modulePath));
  for (const relativePath of viewPaths) {
    const view = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const moduleIndex = view.indexOf('/js/common-library.js');
    const commonIndex = view.indexOf('/js/common.js');
    assert.ok(moduleIndex >= 0, relativePath);
    assert.ok(commonIndex > moduleIndex, relativePath);
  }
});

test('library and history functions belong to common-library', () => {
  const moduleSource = fs.readFileSync(modulePath, 'utf8');
  for (const name of ['readLocalLibrary', 'saveLocalLibraryItem', 'readLocalReadingHistory', 'saveLocalReadingHistoryItem']) {
    assert.match(moduleSource, new RegExp(`function ${name}\\(`));
    assert.doesNotMatch(coordinator, new RegExp(`function ${name}\\(`));
  }
});
```

- [ ] **Step 2: Verify the test is red**

Run: `node --test backend.Tests/js/common-library-contract.test.cjs`

Expected: FAIL because `backend/wwwroot/js/common-library.js` does not exist.

### Task 2: Extract library and history storage

**Files:**
- Create: `backend/wwwroot/js/common-library.js`
- Modify: `backend/wwwroot/js/common.js:36-166`
- Modify: the nine Razor views listed in Task 1.

**Interfaces:**
- Consumes global values `currentUser` and `t` when its functions are invoked after session initialization.
- Produces `LIBRARY_STATUSES`, `getLibraryUserKey`, `readLocalLibrary`, `writeLocalLibrary`, `getLibraryStatusMeta`, `getLibraryStatusLabel`, `getLocalLibraryItem`, `saveLocalLibraryItem`, `removeLocalLibraryItem`, `getReadingHistoryUserKey`, `readLocalReadingHistory`, `writeLocalReadingHistory`, and `saveLocalReadingHistoryItem`.

- [ ] **Step 1: Move the exact existing declarations and function bodies**

Move the declarations beginning with:

```js
const LIBRARY_STATUSES = [
```

and ending after the closing brace of:

```js
function saveLocalReadingHistoryItem(entry) {
```

into `common-library.js`. Preserve the bodies verbatim and add only this header:

```js
// Local manga library and reading-history persistence shared by all pages.
```

- [ ] **Step 2: Load the module before `common.js` on every consumer**

Insert this script immediately before each existing `/js/common.js` reference in all nine views:

```html
<script src="/js/common-library.js?v=1.0"></script>
```

- [ ] **Step 3: Verify the contract becomes green**

Run: `node --test backend.Tests/js/common-library-contract.test.cjs`

Expected: 2 tests pass.

- [ ] **Step 4: Verify both scripts parse**

Run:

```powershell
node --check backend/wwwroot/js/common-library.js
node --check backend/wwwroot/js/common.js
```

Expected: both commands exit with code 0.

### Task 3: Update quality baseline and run regression checks

**Files:**
- Modify: `docs/quality/codebase-baseline.md`

**Interfaces:**
- Consumes all repository files after extraction.
- Produces a saved baseline identical to the generated baseline.

- [ ] **Step 1: Update changed line counts and view asset references**

Generate the baseline using `tools/codebase-baseline.ps1`. Update the `common.js` line count and add `/js/common-library.js` for the nine Razor views without changing unrelated entries.

- [ ] **Step 2: Run all JavaScript checks**

Run `node --check` for every `.js` and `.cjs` file outside `bin`, `obj`, `node_modules`, `App_Data`, and `uploads`; then run every `backend.Tests/js/*.test.cjs` file with `node --test`.

Expected: zero syntax failures and all JavaScript tests pass.

- [ ] **Step 3: Run backend verification**

```powershell
dotnet build backend/MangaNPK.csproj -c Release --no-restore
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore
```

Expected: build succeeds with zero warnings and errors; all backend tests pass.

- [ ] **Step 4: Verify whitespace and deterministic baseline**

Run `git diff --check` on touched files and compare normalized generated/saved baseline text.

Expected: no whitespace errors and exact baseline match.
