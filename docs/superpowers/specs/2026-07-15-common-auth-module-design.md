# Common Auth Module Design

## Goal

Reduce the responsibilities of `backend/wwwroot/js/common.js` without changing the authentication modal UI or behavior.

## Scope

Extract the authentication modal and its text/input helpers into `backend/wwwroot/js/common-auth.js`:

- `initAuthModals`;
- modal text normalization and input-label helpers;
- register email-field setup;
- `openAuthModal` and `switchAuthView`.

Session synchronization, header/sidebar rendering, toast notifications, language/theme controls, library/history storage, and all other common behavior remain in `common.js` or their existing modules.

## Loading and Dependencies

Every Razor view that loads `/js/common.js` also loads `/js/common-auth.js` immediately before it. The extracted functions remain global and resolve `currentUser`, `apiFetch`, `API_BASE`, `showToast`, and `t` when invoked by the existing `DOMContentLoaded` handler.

No ES modules, bundler, package, or runtime dependency is introduced.

## Compatibility

Preserve all auth modal IDs, classes, labels, validation messages, API endpoints, local-session behavior, and Login/Register switching behavior. No HTML, CSS, or visible text changes are allowed.

## Verification

- A contract test fails first because `common-auth.js` and its script references do not exist.
- The contract test verifies all common consumers load the auth module before `common.js` and that auth functions move out of `common.js`.
- All JavaScript and backend tests pass, the Release build has zero warnings/errors, and the generated baseline matches the saved baseline.
