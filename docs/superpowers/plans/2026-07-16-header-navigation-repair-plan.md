# Header And Navigation Repair Implementation Plan

**Goal:** Restore header language/account controls and remove the unintended contribution navigation without changing the visual design.

**Architecture:** Keep locale state in `i18n.js` and shared UI rendering in `common.js`. Protect behavior with source-contract and browser checks.

## Constraints

- Preserve current colors, spacing, classes, and responsive layout.
- Do not change authentication rules or Title Draft workflows.
- Do not retain a sidebar route to `/contribution/title/create`.

## Completed Work

- [x] Add failing regression tests for the unintended contribution route and missing locale refresh.
- [x] Remove the contribution button, click handler, and active-route branch.
- [x] Refresh dynamic account controls on locale changes.
- [x] Load `common-library.js` and `common-auth.js` before `common.js` in all legacy static pages.
- [x] Run focused and complete JavaScript tests.
- [x] Run backend tests and a Release build.
- [x] Verify the header and language switch in a browser with no console errors.
