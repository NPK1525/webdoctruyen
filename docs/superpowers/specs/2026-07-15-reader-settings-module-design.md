# Reader Settings Module Design

## Goal

Reduce the size and responsibilities of `backend/wwwroot/js/reader.js` without changing the reader UI, keyboard shortcuts, local storage keys, DOM selectors, or navigation behavior.

## Scope

Extract the reader settings modal and keyboard-control responsibilities into `backend/wwwroot/js/reader-settings.js`:

- initialize, open, close, and synchronize the settings modal;
- render and load reader key bindings;
- format key labels and register keyboard listeners;
- handle keyboard and mouse-wheel page controls;
- retain the existing global function names so `reader.js` can call them unchanged.

Rendering, chapter fetching, page navigation, reader drawer behavior, progress persistence, and reading-history behavior remain in `reader.js`.

## Loading and Dependencies

`reader-settings.js` loads before `reader.js` in `Views/ChapterView/Read.cshtml`. Its functions execute only after `reader.js` has initialized the shared reader state. The extraction does not introduce ES modules, bundling, or a new runtime dependency.

## Compatibility

The following contracts remain unchanged:

- local storage keys and default key bindings;
- public/global function names used by the reader coordinator;
- HTML IDs and `data-reader-*` attributes;
- keyboard, wheel, fullscreen, fit-mode, chapter, and page-navigation behavior;
- existing API requests and URLs.

## Verification

- A contract test must fail before extraction because `reader-settings.js` and its script reference do not exist.
- The contract test verifies module load order and ownership of the extracted functions.
- All JavaScript files pass `node --check`.
- All JavaScript and backend tests pass.
- The Release build succeeds without warnings or errors.
- The generated codebase baseline matches the saved baseline.
