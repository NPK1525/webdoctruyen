# Shared Page Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all shared catalog/account pages use the same dark/light surface palette and stylesheet generation as Home.

**Architecture:** Keep `style.css` as the single source of theme variables. Replace the separate fixed Library palette with existing variables, then make every MVC consumer request one cache version. A source-level Node contract prevents fixed page surfaces and cache-version drift from returning.

**Tech Stack:** ASP.NET Core Razor, CSS custom properties, Node.js built-in test runner.

## Global Constraints

- Preserve routes, markup structure, spacing, data behavior, and translations.
- Preserve the dedicated manga reader background.
- Do not add a second theme palette or new dependency.
- Do not commit or stage because the workspace contains unrelated user changes.

---

### Task 1: Add the shared-theme regression contract

**Files:**
- Create: `backend.Tests/js/shared-page-theme-contract.test.cjs`
- Test: `backend.Tests/js/shared-page-theme-contract.test.cjs`

**Interfaces:**
- Consumes: `backend/wwwroot/css/style.css` and MVC view stylesheet links.
- Produces: a contract requiring theme-variable surfaces and one `style.css?v=4.9` URL.

- [ ] **Step 1: Write the failing test**

Create tests that read `style.css`, assert `.library-page` uses `var(--bg-main)`, assert the dialog/tabs/cards/pagination use the existing surface and text variables, reject the known fixed palette in those selectors, and assert all MVC views containing `/css/style.css` use `?v=4.9`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test backend.Tests/js/shared-page-theme-contract.test.cjs`

Expected: FAIL because `.library-page` is `#17191b`, core controls are fixed colors, and views use versions 4.6 through 4.8.

### Task 2: Replace the fixed shared-page palette

**Files:**
- Modify: `backend/wwwroot/css/style.css:3484-3627`
- Test: `backend.Tests/js/shared-page-theme-contract.test.cjs`

**Interfaces:**
- Consumes: `--bg-main`, `--bg-card`, `--bg-card-hover`, `--bg-input`, `--border-subtle`, `--text-main`, and `--text-muted` from `style.css`.
- Produces: Library-family surfaces that follow both dark and light theme values automatically.

- [ ] **Step 1: Implement the minimal CSS change**

Change the page background to `var(--bg-main)`. Change the add-to-library dialog, status controls, tabs, view switcher, list/compact/history cards, pagination controls, hover surfaces, text, and borders to the existing shared variables. Remove redundant light-only overrides now represented by those variables, retaining semantic active/accent styling.

- [ ] **Step 2: Run focused test**

Run: `node --test backend.Tests/js/shared-page-theme-contract.test.cjs`

Expected: palette assertions pass while the cache-version assertion still fails.

### Task 3: Unify shared stylesheet cache versions

**Files:**
- Modify: every `backend/Views/**/*.cshtml` file that contains `/css/style.css?v=`
- Test: `backend.Tests/js/shared-page-theme-contract.test.cjs`

**Interfaces:**
- Consumes: `/css/style.css`.
- Produces: `/css/style.css?v=4.9` for every MVC consumer.

- [ ] **Step 1: Update cache URLs**

Replace each existing MVC `style.css` query version with `v=4.9`. Do not alter external stylesheets or page-specific stylesheets.

- [ ] **Step 2: Verify green**

Run: `node --test backend.Tests/js/shared-page-theme-contract.test.cjs`

Expected: PASS.

### Task 4: Full verification

**Files:**
- Verify all modified files.

**Interfaces:**
- Consumes: completed CSS and Razor edits.
- Produces: build and browser evidence.

- [ ] **Step 1: Run all automated checks**

Run all `backend.Tests/js/*.test.cjs`, JavaScript syntax checks, `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore`, `dotnet build backend/MangaNPK.csproj -c Release --no-restore`, and `git diff --check` for touched files.

- [ ] **Step 2: Browser smoke test**

Open Home, Library, Updates, History, Recently Added, and Advanced Search. Confirm their computed body background matches in dark mode. Confirm the shared light-mode CSS rule and variables load, and verify navigation/page content remains intact.
