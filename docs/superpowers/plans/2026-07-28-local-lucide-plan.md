# Local Lucide Dependency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the runtime dependency on `unpkg.com` by vendoring the exact Lucide 1.27.0 browser bundle and license.

**Architecture:** Store the immutable UMD bundle under `wwwroot/vendor`, keep the existing global `lucide.createIcons()` API, and replace every floating CDN reference with one local versioned URL.

**Tech Stack:** Lucide 1.27.0 UMD bundle, Razor views, Node.js built-in test runner, Git.

## Global Constraints

- Exact version: Lucide 1.27.0.
- Runtime URL: `/vendor/lucide/lucide.min.js?v=1.27.0`.
- Keep the official license beside the bundle.
- Do not change icon names or initialization calls.
- No `unpkg.com/lucide` or `@latest` may remain.
- Ignore `/backend/wwwroot/uploads/`.
- Do not push to GitHub.

---

### Task 1: Define the local dependency contract

**Files:**
- Create: `backend.Tests/js/local-lucide.test.cjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Required vendor paths and one script URL for all icon consumers.

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.resolve(__dirname, '../../backend');
const views = path.join(backend, 'Views');
const bundle = path.join(backend, 'wwwroot/vendor/lucide/lucide.min.js');
const license = path.join(backend, 'wwwroot/vendor/lucide/LICENSE');

function filesUnder(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

test('every MVC icon consumer uses the vendored Lucide version', () => {
  assert.equal(fs.existsSync(bundle), true);
  assert.equal(fs.existsSync(license), true);
  const pages = filesUnder(views).filter(file => file.endsWith('.cshtml'));
  const sources = pages.map(file => fs.readFileSync(file, 'utf8'));
  assert.equal(sources.some(source => /unpkg\.com\/lucide|lucide@latest/.test(source)), false);
  const consumers = sources.filter(source => /<!DOCTYPE html>/i.test(source) && /data-lucide=/.test(source));
  assert.ok(consumers.length > 0);
  for (const source of consumers) {
    assert.match(source, /\/vendor\/lucide\/lucide\.min\.js\?v=1\.27\.0/);
  }
});

test('user uploads are ignored by Git', () => {
  const ignore = fs.readFileSync(path.resolve(backend, '../.gitignore'), 'utf8');
  assert.match(ignore, /^\/backend\/wwwroot\/uploads\/$/m);
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```text
node --test backend.Tests/js/local-lucide.test.cjs
```

Expected: FAIL because vendor files do not exist, pages still use unpkg, and uploads are not ignored.

---

### Task 2: Vendor Lucide and replace all consumers

**Files:**
- Create: `backend/wwwroot/vendor/lucide/lucide.min.js`
- Create: `backend/wwwroot/vendor/lucide/LICENSE`
- Modify: `.gitignore`
- Modify every Razor file currently matching `unpkg.com/lucide@latest` under `backend/Views`.

**Interfaces:**
- Produces: Browser global `window.lucide` with `lucide.createIcons()`.

- [ ] **Step 1: Download the exact official package assets**

Download only version 1.27.0 from the official npm/unpkg package:

```text
https://unpkg.com/lucide@1.27.0/dist/umd/lucide.min.js
https://unpkg.com/lucide@1.27.0/LICENSE
```

Save them at the vendor paths above. Verify the bundle contains `createIcons` and the license names Lucide and the ISC license.

- [ ] **Step 2: Replace all page references**

Replace:

```html
<script src="https://unpkg.com/lucide@latest"></script>
```

with:

```html
<script src="/vendor/lucide/lucide.min.js?v=1.27.0"></script>
```

Apply this to every result of:

```text
Get-ChildItem backend/Views -Recurse -File -Filter *.cshtml | Select-String -Pattern 'unpkg.com/lucide@latest'
```

- [ ] **Step 3: Ignore uploads permanently**

Append exactly:

```gitignore
# User-uploaded runtime content
/backend/wwwroot/uploads/
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the command from Task 1.

Expected: PASS.

- [ ] **Step 5: Verify the runtime API without a browser**

Run:

```text
Select-String -Path backend/wwwroot/vendor/lucide/lucide.min.js -Pattern 'createIcons'
```

Expected: at least one match.

---

### Task 3: Complete verification and commit

**Files:**
- Verify all files changed in Tasks 1-2.

**Interfaces:**
- Consumes: Profile MVC and CSRF work from the preceding plans.
- Produces: Final verified local web application.

- [ ] **Step 1: Run all automated checks**

```text
node --test backend.Tests/js
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --verbosity quiet
dotnet build backend/MangaNPK.csproj -c Release --no-restore --verbosity quiet
git diff --check
```

Expected: all tests pass; build has 0 warnings and 0 errors; no whitespace errors.

- [ ] **Step 2: Run live route checks**

With the application running at `http://127.0.0.1:5274`:

```text
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5274/profile
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5274/profile.html -MaximumRedirection 0
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5274/vendor/lucide/lucide.min.js
```

Expected:

- `/profile`: HTTP 200.
- `/profile.html`: redirect to `/profile`.
- Local Lucide bundle: HTTP 200.

- [ ] **Step 3: Commit**

```text
git add .gitignore backend/Views backend/wwwroot/vendor/lucide backend.Tests/js/local-lucide.test.cjs
git commit -m "build: vendor Lucide browser bundle"
```

- [ ] **Step 4: Report without pushing**

Report the three new commit hashes, automated test counts, build result, live route results, and confirm that `backend/wwwroot/uploads/` remains untracked and ignored. Do not push.
