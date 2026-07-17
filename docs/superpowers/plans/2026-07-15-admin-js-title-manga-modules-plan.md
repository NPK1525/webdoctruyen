# Admin JavaScript Title and Manga Modules Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Extract Title Draft and Manga management rendering/actions from `admin.js` while preserving global names, DOM IDs, request payloads and UI.

**Architecture:** Continue the existing classic-script model. `admin-title-drafts.js` and `admin-manga.js` load before `admin.js`, share existing lexical state, and expose the same function declarations used by current event wiring.

**Constraints:** No API, DOM, CSS or visual changes; no module bundler; all syntax and contract tests must pass.

### Tasks

- [ ] Extract title-draft functions into `admin-title-drafts.js`.
- [ ] Extract manga table/edit/delete functions into `admin-manga.js`.
- [ ] Load both files before `admin.js` and add contract coverage.
- [ ] Run baseline, backend tests, JavaScript syntax and JavaScript tests.
