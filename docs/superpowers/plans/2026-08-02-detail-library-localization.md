# Detail Library Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining mixed English/Vietnamese copy from manga-detail library controls and keep the advanced tag panel open while tags are selected.

**Architecture:** Static modal copy is localized through the existing `data-i18n` mechanism. Dynamic library/follow labels are refreshed through one locale-change handler after dictionaries load or the locale changes. Tag clicks stop bubbling before their button is replaced during rerender, so only the existing outside-click and dismiss controls close the panel.

**Tech Stack:** ASP.NET Core Razor, browser JavaScript, JSON locale dictionaries, Node.js built-in test runner.

## Global Constraints

- Reuse the existing i18n service and locale files.
- Keep canonical taxonomy/tag names in English.
- Do not reload the page when switching language.
- Do not alter unrelated untracked files.

---

### Task 1: Keep the advanced tag panel open

**Files:**
- Modify: `backend.Tests/js/advanced-search-filters.test.cjs`
- Modify: `backend/wwwroot/js/advanced-search-filters.js`

**Interfaces:**
- Consumes: existing tag button click handler and document outside-click handler.
- Produces: tag clicks that rerender selected state without reaching the outside-click handler.

- [ ] Add a failing contract test requiring the tag handler to call `event.stopPropagation()` before `renderTags()`.
- [ ] Run `node --test backend.Tests/js/advanced-search-filters.test.cjs` and confirm the new assertion fails.
- [ ] Change the handler to accept `event` and stop propagation before updating state.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Fully localize manga-detail library controls

**Files:**
- Modify: `backend.Tests/js/detail-module-contract.test.cjs`
- Modify: `backend/Views/MangaView/Detail.cshtml`
- Modify: `backend/wwwroot/js/detail.js`
- Modify: `backend/wwwroot/locales/en.json`
- Modify: `backend/wwwroot/locales/vi.json`

**Interfaces:**
- Consumes: `t(key, fallback)`, `manganpk:localechanged`, `updateBookmarkButton()`, `updateLibraryStatusButton()`, `renderAddLibraryStatusMenu()`, `updateAddLibrarySelectedStatus()`, and `updateAddLibrarySubmitLabel()`.
- Produces: `refreshDetailLocalizedControls()` as the single refresh entry point for dynamic labels.

- [ ] Add failing tests for modal i18n hooks, required locale keys, and the dynamic locale refresh contract.
- [ ] Run `node --test backend.Tests/js/detail-module-contract.test.cjs` and confirm those assertions fail.
- [ ] Add `data-i18n`/translated attributes to the modal and initial library button.
- [ ] Add missing English and Vietnamese locale entries.
- [ ] Implement `refreshDetailLocalizedControls()` and subscribe it to `manganpk:localechanged`.
- [ ] Refresh the status menu whenever the modal opens and bump the detail asset version.
- [ ] Re-run the focused detail test and confirm it passes.

### Task 3: Regression verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: all JavaScript contract tests and the ASP.NET Core solution.
- Produces: verification evidence for both requested behaviors.

- [ ] Run the complete JavaScript test suite.
- [ ] Run the Release build.
- [ ] Review `git diff` and confirm only scoped files plus this plan changed.
