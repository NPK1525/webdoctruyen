# Reader Settings Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract reader settings and input bindings from `reader.js` without changing the reader UI or behavior.

**Architecture:** Keep the existing global-script architecture. Load `reader-settings.js` before `reader.js`; the extracted functions retain their names and resolve shared reader state when invoked after initialization.

**Tech Stack:** JavaScript, Node.js built-in test runner, ASP.NET Core Razor views, .NET 10.

## Global Constraints

- Preserve all HTML IDs and `data-reader-*` attributes.
- Preserve local storage keys, default key bindings, URLs, and reader behavior.
- Do not introduce ES modules, bundling, or runtime dependencies.
- Do not commit because the shared worktree contains user-owned changes.

---

### Task 1: Lock the reader module contract

**Files:**
- Create: `backend.Tests/js/reader-settings-contract.test.cjs`

**Interfaces:**
- Consumes: `backend/Views/ChapterView/Read.cshtml`, `backend/wwwroot/js/reader.js`.
- Produces: a contract requiring `/js/reader-settings.js` before `/js/reader.js` and requiring extracted function ownership.

- [ ] **Step 1: Write the failing contract test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const view = fs.readFileSync(path.join(root, 'Views/ChapterView/Read.cshtml'), 'utf8');
const coordinator = fs.readFileSync(path.join(root, 'wwwroot/js/reader.js'), 'utf8');
const modulePath = path.join(root, 'wwwroot/js/reader-settings.js');

test('reader settings module loads before the reader coordinator', () => {
  assert.ok(fs.existsSync(modulePath));
  assert.ok(view.indexOf('/js/reader-settings.js') < view.indexOf('/js/reader.js'));
});

test('settings and input functions belong to the extracted module', () => {
  const moduleSource = fs.readFileSync(modulePath, 'utf8');
  for (const name of ['initReaderSettingsModal', 'renderReaderKeybinds', 'handleReaderKeydown', 'handleReaderWheel']) {
    assert.match(moduleSource, new RegExp(`function ${name}\\(`));
    assert.doesNotMatch(coordinator, new RegExp(`function ${name}\\(`));
  }
});
```

- [ ] **Step 2: Verify the test fails for the missing module**

Run: `node --test backend.Tests/js/reader-settings-contract.test.cjs`

Expected: FAIL because `backend/wwwroot/js/reader-settings.js` does not exist.

### Task 2: Extract reader settings and input bindings

**Files:**
- Create: `backend/wwwroot/js/reader-settings.js`
- Modify: `backend/wwwroot/js/reader.js:676-855`
- Modify: `backend/Views/ChapterView/Read.cshtml`

**Interfaces:**
- Consumes shared reader state: `readerKeybinds`, `readingMode`, `scrollTurnMode`, `lastWheelTurnAt`, `chapterDetail`, and the existing reader navigation/settings functions.
- Produces global functions: `initReaderSettingsModal`, `openReaderSettingsModal`, `closeReaderSettingsModal`, `syncReaderSettingsUI`, `renderReaderKeybinds`, `loadReaderKeybinds`, `formatKeybind`, `initReaderKeybinds`, `isTypingTarget`, `keyMatches`, `handleReaderKeydown`, and `handleReaderWheel`.

- [ ] **Step 1: Move the exact existing function bodies into the new file**

Move the twelve functions listed under **Produces** from `reader.js` into `reader-settings.js`. Keep their signatures, selectors, event listeners, local storage access, and bodies byte-for-byte except for the file header comment:

```js
// Reader settings modal, persisted preferences, and input bindings.
```

- [ ] **Step 2: Load the module before the coordinator**

Add this immediately before the existing reader script in `Read.cshtml`:

```html
<script src="/js/reader-settings.js?v=1.0"></script>
<script src="/js/reader.js?v=4.6"></script>
```

- [ ] **Step 3: Verify the contract is green**

Run: `node --test backend.Tests/js/reader-settings-contract.test.cjs`

Expected: 2 tests pass.

- [ ] **Step 4: Verify both scripts parse**

Run: `node --check backend/wwwroot/js/reader-settings.js` and `node --check backend/wwwroot/js/reader.js`.

Expected: both commands exit with code 0.

### Task 3: Update baseline and run regression checks

**Files:**
- Modify: `docs/quality/codebase-baseline.md`

**Interfaces:**
- Consumes the complete repository after extraction.
- Produces a saved baseline identical to `tools/codebase-baseline.ps1` output.

- [ ] **Step 1: Update only changed line counts and view asset references**

Run `tools/codebase-baseline.ps1`, compare it with `docs/quality/codebase-baseline.md`, and add `/js/reader-settings.js` under `ChapterView/Read.cshtml`.

- [ ] **Step 2: Run all JavaScript syntax and contract tests**

Run `node --check` for every `.js` and `.cjs` file outside generated/upload directories, then run all files in `backend.Tests/js/*.test.cjs` with `node --test`.

Expected: zero syntax failures and all tests pass.

- [ ] **Step 3: Run backend verification**

Run:

```powershell
dotnet build backend/MangaNPK.csproj -c Release --no-restore
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore
```

Expected: build succeeds with zero warnings and errors; all backend tests pass.

- [ ] **Step 4: Check whitespace and baseline determinism**

Run `git diff --check` for the touched files and compare normalized generated/saved baseline content.

Expected: no whitespace errors and exact baseline match.
