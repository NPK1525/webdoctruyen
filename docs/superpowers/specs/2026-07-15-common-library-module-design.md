# Common Library Module Design

## Goal

Reduce the responsibilities of `backend/wwwroot/js/common.js` without changing any page UI, HTML, CSS, API request, navigation behavior, or persisted user data.

## Scope

Extract the local library and reading-history responsibilities into `backend/wwwroot/js/common-library.js`:

- library status metadata and labels;
- user-scoped library storage keys;
- reading, writing, saving, and removing local library entries;
- user-scoped reading-history storage keys;
- reading, writing, and saving local reading-history entries;
- existing `manganpk:librarychanged` and `manganpk:historychanged` events.

Authentication, session initialization, sidebar/header rendering, search, toast notifications, language controls, theme controls, and auth modals remain in `common.js`.

## Loading and Dependencies

Every Razor view that currently loads `/js/common.js` must load `/js/common-library.js` immediately before it. The extracted functions retain their current global names and resolve `currentUser` and `t` only when called after `common.js` has initialized the shared session state.

No ES modules, bundler, package, or new runtime dependency will be introduced.

## Compatibility

The extraction preserves:

- every function name used by detail, library, history, index, and reader scripts;
- all local storage keys and stored object fields;
- event names and dispatch timing;
- status values, fallback labels, and icons;
- script behavior on anonymous and authenticated sessions;
- all visible UI and text.

## Verification

- A contract test must fail first because `common-library.js` and its script references do not exist.
- The contract test verifies that all views load the module before `common.js` and that ownership of the extracted functions moves out of `common.js`.
- All JavaScript files pass syntax checking.
- All JavaScript and backend tests pass.
- The Release build succeeds with zero warnings and errors.
- The generated codebase baseline matches the saved baseline.
