# MN List Internationalization and Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the user-facing list feature to MN List and make all static and dynamic UI copy and colors follow the shared language and theme systems.

**Architecture:** Extend the existing locale dictionaries and use the existing `t()`/`I18N.apply()` flow for page copy. Keep theme ownership in `common.js`, replacing MDList-specific hard-coded colors with shared CSS variables and a minimal scoped semantic palette.

**Tech Stack:** Razor, vanilla JavaScript, JSON locale dictionaries, CSS custom properties, Node test runner.

## Global Constraints

- English singular is `MN List`; English plural is `MN Lists`.
- Vietnamese label is `Danh sách MN`.
- No user-facing `MDList`, `MDLists`, or `MD List` text remains.
- Preserve `/lists`, `/api/mangalist`, database names, C# types, and data contracts.
- Language changes update visible dynamic content without reloading.
- Theme changes remain owned by `common.js`.
- Do not commit the dirty workspace.

---

### Task 1: Translation contracts and dictionaries

**Files:**
- Modify: `backend.Tests/js/mdlist-mvc-contract.test.cjs`
- Modify: `backend.Tests/js/mdlists-behavior.test.cjs`
- Modify: `backend/wwwroot/locales/en.json`
- Modify: `backend/wwwroot/locales/vi.json`

**Interfaces:**
- Produces: complete `mdlists.*` keys shared by Razor and `mdlists.js`.

- [ ] Add failing tests that parse both JSON files, compare all `mdlists.*` keys, assert the English/Vietnamese names, and reject user-facing legacy branding.
- [ ] Run the two focused Node test files and confirm failure for missing keys and legacy copy.
- [ ] Add translations for headings, actions, visibility, empty states, picker views, thirteen sorts, counts, validation, loading, errors, confirmation, and status copy.
- [ ] Re-run focused tests until dictionary coverage passes.

### Task 2: Razor naming and static translation hooks

**Files:**
- Modify: `backend/Views/MangaListsView/Index.cshtml`
- Modify: `backend.Tests/js/mdlist-mvc-contract.test.cjs`

**Interfaces:**
- Consumes: `mdlists.*` locale keys from Task 1.
- Produces: `data-i18n`, `data-i18n-placeholder`, and translated accessibility labels.

- [ ] Add failing structural assertions for `MN Lists`, translation attributes, placeholders, status regions, and absence of visible legacy branding.
- [ ] Run the structural test and confirm RED.
- [ ] Replace static copy and placeholders with locale-backed hooks while retaining stable DOM IDs.
- [ ] Run the structural test and confirm GREEN.

### Task 3: Dynamic JavaScript translation and live rerender

**Files:**
- Modify: `backend/wwwroot/js/mdlists.js`
- Modify: `backend.Tests/js/mdlists-behavior.test.cjs`

**Interfaces:**
- Consumes: global `t(key, fallback)` and `manganpk:localechanged` event.
- Produces: translated dynamic cards, editor state, picker results, status messages, confirmation, counts, and sort labels.

- [ ] Add failing assertions that all UI messages use `mdText(key, fallback)` and a `manganpk:localechanged` listener rerenders the active state.
- [ ] Run the focused behavior test and confirm RED.
- [ ] Add a small translation wrapper and store status keys/parameters instead of only rendered text.
- [ ] Translate dynamic copy, rerender current state on language change, and call `I18N.apply()` for static hooks.
- [ ] Run focused behavior and syntax tests until GREEN.

### Task 4: Shared light/dark theme styling

**Files:**
- Modify: `backend/wwwroot/css/mdlists.css`
- Modify: `backend.Tests/js/mdlist-mvc-contract.test.cjs`

**Interfaces:**
- Consumes: shared CSS variables and `body.light-mode` from `common.js`.
- Produces: theme-safe overview, editor, picker, dropdown, cards, statuses, and responsive controls.

- [ ] Add failing CSS contract checks that require shared variables and reject fixed dark page/card/input/panel backgrounds.
- [ ] Run the focused contract test and confirm RED.
- [ ] Replace hard-coded component surfaces/text/borders with shared variables and define scoped info/error variables for both modes.
- [ ] Run focused tests and inspect both theme states in browser if the local app is available.

### Task 5: Full verification

**Files:**
- Modify only files required to correct regressions caused by Tasks 1-4.

**Interfaces:**
- Produces: verified MN List behavior with no runtime contract changes.

- [ ] Parse both locale JSON files.
- [ ] Run JavaScript syntax checks.
- [ ] Run all Node tests.
- [ ] Run all .NET tests.
- [ ] Run the Release build.
- [ ] Run `git diff --check` on the touched files and review the final diff for legacy user-facing names and hard-coded dark surfaces.
