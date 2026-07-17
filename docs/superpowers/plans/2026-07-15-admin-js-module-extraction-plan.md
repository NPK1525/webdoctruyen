# Admin JavaScript Module Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Reduce `admin.js` responsibility by extracting chapter upload and MangaDex import modules without changing DOM IDs, global handlers or visual behavior.

**Architecture:** Keep the existing classic-script loading model and shared lexical state. New files load before `admin.js`; functions remain globally callable so existing inline handlers and the current initialization sequence continue to work. No bundler or module syntax is introduced.

**Tech Stack:** Vanilla JavaScript, Razor classic script tags, Node `--check` and existing Node tests.

## Global Constraints

- Preserve all DOM IDs, event listeners, global function names and request payloads.
- Preserve the current stylesheet and visual output.
- Do not change API URLs or response handling.
- Keep files UTF-8 and avoid mass formatting.

---

### Task 1: Lock script/global contracts

- [ ] Add a Node-readable contract test listing the functions required by `admin.js`, upload handlers and MangaDex handlers.
- [ ] Verify the test is red for the new module files before extraction.

### Task 2: Extract chapter upload

- [ ] Create `backend/wwwroot/js/admin-upload.js` with upload state, file upload, previews and upload event initialization.
- [ ] Load it before `admin.js` in `Views/AdminView/Index.cshtml`.
- [ ] Remove the moved function bodies from `admin.js` without changing their names or DOM selectors.

### Task 3: Extract MangaDex import

- [ ] Create `backend/wwwroot/js/admin-mangadex.js` with preview/import initialization, busy state, rendering and HTML escaping.
- [ ] Load it before `admin.js`.
- [ ] Remove the moved function bodies from `admin.js` while preserving the shared `mangaDexPreview` state.

### Task 4: Verify

- [ ] Run Node syntax checks, existing JavaScript tests, backend build/tests and the baseline comparison.
- [ ] Record the reduced `admin.js` line count; do not claim browser smoke while LocalDB is unavailable.
