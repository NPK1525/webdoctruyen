# Header And Navigation Repair Design

## Goal

Restore the existing MangaNPK header and sidebar behavior without redesigning the interface.

## Scope

- Remove the unintended `Đóng góp truyện` sidebar item and its client-side route handling.
- Keep the language button and the unauthenticated `Đăng nhập` / `Đăng ký` buttons in the existing header row.
- Preserve authenticated behavior: account buttons are replaced by the existing profile controls after a valid session is detected.
- Refresh dynamic account and footer labels immediately after a language change.
- Keep legacy static HTML pages compatible with the extracted authentication and library modules.
- Preserve current colors, spacing, button classes, and responsive layout.

## Architecture

`i18n.js` remains the single owner of locale loading and locale-change events. `common.js` remains responsible for shared navigation and account rendering. Static pages load the extracted modules before `common.js`, matching the Razor views.

## Error Handling

If a locale file cannot be loaded, the current locale and visible UI remain unchanged. Authentication rendering continues to use the existing session endpoint and fallback behavior.

## Verification

Contract tests verify the navigation, account controls, locale refresh, and dependency order. Existing JavaScript and backend test suites plus a Release build guard against regressions. A browser smoke test verifies the rendered controls and language switch.
