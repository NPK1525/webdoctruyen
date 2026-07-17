# Common Auth Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract authentication modal logic from `common.js` without changing its UI or behavior.

**Architecture:** Keep the global-script architecture. Load `common-auth.js` immediately before `common.js` on the same nine Razor views already using the common library module; preserve all global function names and runtime dependencies.

**Tech Stack:** JavaScript, Node.js built-in test runner, ASP.NET Core Razor views, .NET 10.

## Global Constraints

- Preserve all auth modal IDs, classes, labels, validation messages, API endpoints, and Login/Register behavior.
- Do not introduce ES modules, bundling, packages, or runtime dependencies.
- Do not commit because the shared worktree contains user-owned changes.

---

### Task 1: Lock the auth module contract

**Files:**
- Create: `backend.Tests/js/common-auth-contract.test.cjs`

**Interfaces:**
- Consumes the nine Razor views and `backend/wwwroot/js/common.js`.
- Produces a contract requiring `/js/common-auth.js` before `/js/common.js` and auth-function ownership in the extracted module.

- [ ] **Step 1: Write the failing test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const viewPaths = [
  'Views/AdminView/Index.cshtml', 'Views/ChapterView/Read.cshtml',
  'Views/HistoryView/Index.cshtml', 'Views/Home/Index.cshtml',
  'Views/LibraryView/Index.cshtml', 'Views/MangaView/Detail.cshtml',
  'Views/MangaView/Index.cshtml', 'Views/RecentlyAddedView/Index.cshtml',
  'Views/UpdatesView/Index.cshtml'
];
const modulePath = path.join(root, 'wwwroot/js/common-auth.js');
const coordinator = fs.readFileSync(path.join(root, 'wwwroot/js/common.js'), 'utf8');

test('every common consumer loads common-auth before common.js', () => {
  assert.ok(fs.existsSync(modulePath));
  for (const relativePath of viewPaths) {
    const view = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.ok(view.indexOf('/js/common-auth.js') < view.indexOf('/js/common.js'), relativePath);
  }
});

test('auth functions belong to common-auth', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  for (const name of ['initAuthModals', 'openAuthModal', 'switchAuthView', 'normalizeAuthModalText']) {
    assert.match(source, new RegExp(`function ${name}\\(`));
    assert.doesNotMatch(coordinator, new RegExp(`function ${name}\\(`));
  }
});
```

- [ ] **Step 2: Verify the test is red**

Run: `node --test backend.Tests/js/common-auth-contract.test.cjs`

Expected: FAIL because `common-auth.js` does not exist.

### Task 2: Extract auth modal logic

**Files:**
- Create: `backend/wwwroot/js/common-auth.js`
- Modify: `backend/wwwroot/js/common.js` by removing the block from `function initAuthModals()` through `function switchAuthView()`.
- Modify: the nine Razor views listed in Task 1.

**Interfaces:**
- Consumes `currentUser`, `apiFetch`, `API_BASE`, `showToast`, and `t` when functions execute.
- Produces `initAuthModals`, `normalizeAuthModalText`, `setAuthInputLabel`, `ensureRegisterEmailField`, `openAuthModal`, and `switchAuthView` as global functions.

- [ ] **Step 1: Move the exact existing auth block**

Copy the existing declarations beginning at `function initAuthModals() {` and ending after `function switchAuthView(viewMode) {` into `common-auth.js`, preserving every body and selector. Add only this header:

```js
// Shared login/register modal behavior.
```

- [ ] **Step 2: Load the module before common.js**

Insert this script immediately before each existing `/js/common.js` reference:

```html
<script src="/js/common-auth.js?v=1.0"></script>
```

- [ ] **Step 3: Verify the contract and syntax**

Run `node --test backend.Tests/js/common-auth-contract.test.cjs`, `node --check backend/wwwroot/js/common-auth.js`, and `node --check backend/wwwroot/js/common.js`.

Expected: 2 contract tests pass and both syntax checks exit 0.

### Task 3: Update baseline and run regressions

**Files:**
- Modify: `docs/quality/codebase-baseline.md`

- [ ] **Step 1: Update generated line counts and nine view references**

Run `tools/codebase-baseline.ps1`, update only changed counts and `/js/common-auth.js` references, and compare the normalized generated and saved files.

- [ ] **Step 2: Run all JavaScript checks**

Run syntax checks for all `.js`/`.cjs` files outside generated/upload directories, then run all `backend.Tests/js/*.test.cjs` files with `node --test`.

Expected: zero syntax failures and all JavaScript tests pass.

- [ ] **Step 3: Run backend verification**

```powershell
dotnet build backend/MangaNPK.csproj -c Release --no-restore
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore
```

Expected: build succeeds with zero warnings/errors and all backend tests pass.

- [ ] **Step 4: Check whitespace and baseline determinism**

Run `git diff --check` on touched files and compare generated/saved baseline text exactly.

Expected: no whitespace errors and exact baseline match.
