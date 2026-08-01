# Account Menu and Profile Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant Settings account-menu link and hide profile Badge controls from regular users while preserving theme switching, role labels, and admin Badge management.

**Architecture:** Keep the cleanup entirely in the shared account renderer and profile presentation layer. Contract tests guard that user-facing Badge markup and payload fields are absent, while admin files and backend Badge storage remain untouched.

**Tech Stack:** ASP.NET Core Razor, browser JavaScript, Node.js built-in test runner.

## Global Constraints

- Keep the account role label such as `ADMIN`.
- Keep Badge fields in admin user management and backend admin APIs.
- Keep reader settings unchanged.
- Do not modify or delete `appthoitrang_ascii/`.

---

### Task 1: Remove the redundant account Settings link

**Files:**
- Modify: `backend.Tests/js/common-auth-contract.test.cjs`
- Modify: `backend.Tests/js/avatar-sync.test.cjs`
- Modify: `backend.Tests/js/shared-page-theme-contract.test.cjs`
- Modify: `backend/wwwroot/js/common.js`
- Modify: `backend/Views/AdminView/Authors.cshtml`
- Modify: `backend/Views/AdminView/Genres.cshtml`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/Views/AdminView/Reports.cshtml`
- Modify: `backend/Views/AdminView/UserDetail.cshtml`
- Modify: `backend/Views/ChapterView/Read.cshtml`
- Modify: `backend/Views/FollowedUpdatesView/Index.cshtml`
- Modify: `backend/Views/HistoryView/Index.cshtml`
- Modify: `backend/Views/Home/Index.cshtml`
- Modify: `backend/Views/LibraryView/Index.cshtml`
- Modify: `backend/Views/MangaListsView/Index.cshtml`
- Modify: `backend/Views/MangaView/Detail.cshtml`
- Modify: `backend/Views/MangaView/Index.cshtml`
- Modify: `backend/Views/ProfileView/Index.cshtml`
- Modify: `backend/Views/RecentlyAddedView/Index.cshtml`
- Modify: `backend/Views/Reports/Index.cshtml`
- Modify: `backend/Views/UpdatesView/Index.cshtml`

**Interfaces:**
- Consumes: `renderHeaderUserArea()` account-dropdown markup and `#dropdown-theme-toggle` click handling.
- Produces: An account dropdown with no `user.settings` link and one full-width `#dropdown-theme-toggle` control.

- [ ] **Step 1: Replace the old navigation assertion with a failing absence/layout contract**

```javascript
test('account menu omits redundant settings while preserving theme control', () => {
  assert.doesNotMatch(coordinator, /t\('user\.settings'/);
  assert.doesNotMatch(coordinator, /data-lucide="settings"/);
  assert.match(coordinator, /id="dropdown-theme-toggle"[^>]*flex:\s*1/);
  assert.match(coordinator, /nav-lists-btn[\s\S]*?window\.location\.href = '\/lists'/);
});
```

- [ ] **Step 2: Run the contract and verify it fails**

Run: `node --test backend.Tests/js/common-auth-contract.test.cjs`

Expected: FAIL because `common.js` still renders the Settings link.

- [ ] **Step 3: Remove only the Settings anchor from the account row**

Replace the two-control row in `renderHeaderUserArea()` with:

```javascript
<div style="display: flex; gap: 4px;">
  <div id="dropdown-theme-toggle" class="dropdown-item-link" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border-radius: 6px; font-size: 0.8rem; color: var(--text-main); cursor: pointer;">
    <i data-lucide="droplet" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
    <span>${t('user.theme', 'Giao diện')}</span>
  </div>
</div>
```

- [ ] **Step 4: Bump the shared-script cache version**

In every Razor view that currently contains:

```html
<script src="/js/common.js?v=5.8"></script>
```

replace it with:

```html
<script src="/js/common.js?v=5.9"></script>
```

Update cache-version assertions in `backend.Tests/js/common-auth-contract.test.cjs`, `backend.Tests/js/avatar-sync.test.cjs`, and `backend.Tests/js/shared-page-theme-contract.test.cjs` from `5.8` to `5.9`.

- [ ] **Step 5: Run shared-account contracts**

Run: `node --test backend.Tests/js/common-auth-contract.test.cjs backend.Tests/js/avatar-sync.test.cjs backend.Tests/js/shared-page-theme-contract.test.cjs`

Expected: all tests PASS.

---

### Task 2: Hide profile Badge display, input, and submission

**Files:**
- Modify: `backend.Tests/js/profile-copy-i18n.test.cjs`
- Modify: `backend.Tests/js/avatar-sync.test.cjs`
- Modify: `backend/Views/ProfileView/Index.cshtml`
- Modify: `backend/wwwroot/js/profile.js`

**Interfaces:**
- Consumes: `renderProfile()` and `handleEditProfile(e)`.
- Produces: A profile UI and update payload containing `avatarUrl` and `bio`, but no Badge presentation or mutation.

- [ ] **Step 1: Add failing profile Badge-absence contracts**

Add to `profile-copy-i18n.test.cjs`:

```javascript
test('regular profile hides administrator-managed badge controls', () => {
  assert.doesNotMatch(profileHtml, /id="profile-badge(?:-container|-input)?"/);
  assert.doesNotMatch(profileHtml, /data-i18n="profile\.badge"/);
});
```

In `avatar-sync.test.cjs`, load `profile.js` as already done and add:

```javascript
test('profile script neither renders nor submits badge values', () => {
  assert.doesNotMatch(profile, /profile-badge/);
  assert.doesNotMatch(profile, /\bbadge\s*:/);
  assert.match(profile, /JSON\.stringify\(\{[\s\S]*?avatarUrl,[\s\S]*?bio:\s*bio\s*\|\|\s*null[\s\S]*?\}\)/);
});
```

Change the avatar-clear assertion to require `avatarUrl` followed by `bio`, rather than `badge`.

- [ ] **Step 2: Run the profile contracts and verify they fail**

Run: `node --test backend.Tests/js/profile-copy-i18n.test.cjs backend.Tests/js/avatar-sync.test.cjs`

Expected: FAIL because the Razor page and JavaScript still reference `profile-badge`.

- [ ] **Step 3: Remove Badge markup from the regular profile view**

Delete both blocks from `backend/Views/ProfileView/Index.cshtml`:

```html
<div id="profile-badge-container">...</div>
```

and:

```html
<div class="form-group">
  <label class="form-label" data-i18n="profile.badge">Badge</label>
  <input type="text" id="profile-badge-input" ... />
</div>
```

Do not modify `backend/Views/AdminView/Index.cshtml`, `backend/Views/AdminView/UserDetail.cshtml`, or admin JavaScript.

- [ ] **Step 4: Remove Badge handling from the profile script**

Delete the Badge rendering block and the assignment to `profile-badge-input`. Change `handleEditProfile(e)` to read only:

```javascript
const avatarUrl = document.getElementById('profile-avatar-url').value.trim();
const bio = document.getElementById('profile-bio-input').value.trim();
```

and submit:

```javascript
body: JSON.stringify({
  avatarUrl,
  bio: bio || null
})
```

- [ ] **Step 5: Bump the profile script cache version**

In `backend/Views/ProfileView/Index.cshtml`, replace:

```html
<script src="/js/profile.js?v=1.4"></script>
```

with:

```html
<script src="/js/profile.js?v=1.5"></script>
```

Update the cache assertion in `backend.Tests/js/avatar-sync.test.cjs` to `1.5`.

- [ ] **Step 6: Run profile and admin regression contracts**

Run: `node --test backend.Tests/js/profile-copy-i18n.test.cjs backend.Tests/js/avatar-sync.test.cjs backend.Tests/js/admin-user-management.test.cjs backend.Tests/js/admin-user-security.test.cjs`

Expected: all tests PASS, including admin Badge management.

---

### Task 3: Full verification

**Files:**
- Verify only; no production file changes expected.

**Interfaces:**
- Consumes: completed account and profile cleanup.
- Produces: evidence that all frontend contracts and backend regressions remain green.

- [ ] **Step 1: Run all JavaScript contracts**

```powershell
$tests = Get-ChildItem -LiteralPath 'backend.Tests\js' -File -Filter '*.test.cjs' | ForEach-Object { $_.FullName }
node --test $tests
```

Expected: 0 failures.

- [ ] **Step 2: Run backend tests without the known inaccessible unrelated source tree**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter "FullyQualifiedName!~SourceEncodingTests" --no-restore -p:BaseOutputPath=D:\webdoctruyen\.test-output\account-profile-cleanup\`

Expected: 0 failures.

- [ ] **Step 3: Verify workspace scope**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; `appthoitrang_ascii/` remains unmodified and untracked.

- [ ] **Step 4: Commit implementation**

```powershell
git add -- backend.Tests/js/common-auth-contract.test.cjs backend.Tests/js/profile-copy-i18n.test.cjs backend.Tests/js/avatar-sync.test.cjs backend.Tests/js/shared-page-theme-contract.test.cjs backend/Views/AdminView/Authors.cshtml backend/Views/AdminView/Genres.cshtml backend/Views/AdminView/Index.cshtml backend/Views/AdminView/Reports.cshtml backend/Views/AdminView/UserDetail.cshtml backend/Views/ChapterView/Read.cshtml backend/Views/FollowedUpdatesView/Index.cshtml backend/Views/HistoryView/Index.cshtml backend/Views/Home/Index.cshtml backend/Views/LibraryView/Index.cshtml backend/Views/MangaListsView/Index.cshtml backend/Views/MangaView/Detail.cshtml backend/Views/MangaView/Index.cshtml backend/Views/ProfileView/Index.cshtml backend/Views/RecentlyAddedView/Index.cshtml backend/Views/Reports/Index.cshtml backend/Views/UpdatesView/Index.cshtml backend/wwwroot/js/common.js backend/wwwroot/js/profile.js docs/superpowers/plans/2026-08-02-account-menu-profile-cleanup.md
git commit -m "feat: simplify account profile controls"
```
