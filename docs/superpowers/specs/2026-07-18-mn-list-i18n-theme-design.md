# MN List Internationalization and Theme Design

## Goal

Rename the user-facing MDList feature to MN List and make every overview, editor, picker, menu, status, and confirmation respond correctly to the shared VI/EN language and light/dark theme controls.

## Naming

- English singular: `MN List`.
- English plural: `MN Lists`.
- Vietnamese singular and plural label: `Danh sách MN`.
- Remove user-facing `MDList`, `MDLists`, and `MD List` copy.
- Preserve `/lists`, `/api/mangalist`, database table names, C# type names, and existing data contracts to avoid migrations and broken links.

## Internationalization

- Add a complete `mdlists.*` namespace to `wwwroot/locales/en.json` and `vi.json`.
- Razor text uses `data-i18n` and `data-i18n-placeholder` where the shared translator supports them.
- Dynamic JavaScript copy uses the existing `t(key, fallback)` helper.
- Translate headings, empty states, buttons, visibility, search, view labels, all thirteen sort labels, counts, loading states, validation, API fallbacks, delete confirmation, and success/error messages.
- Register a `manganpk:localechanged` listener on the MN List page, matching the existing shared i18n event. It reapplies static translations and rerenders current cards, editor labels, selected items, sort labels, picker results, and visible status messages without reloading.
- User-entered names, descriptions, manga titles, usernames, and backend-provided data remain unchanged.

## Theme Integration

- Replace page-specific dark backgrounds and text colors with the shared variables: `--bg-main`, `--bg-card`, `--bg-card-hover`, `--bg-input`, `--bg-input-focus`, `--text-main`, `--text-muted`, `--text-bright`, `--border-subtle`, and the existing primary/accent variables.
- Add only small MN List-scoped variables where the shared palette has no semantic equivalent, such as error/info surfaces. Define both default and `body.light-mode` values.
- Preserve visibility badge semantics: green public and red private, with sufficient contrast in both themes.
- The modal overlay remains translucent black, while its panel, inputs, dropdowns, cards, controls, and empty states follow the active theme.
- Theme changes remain owned by `common.js`; the MN List page requires no separate toggle or persisted setting.

## Components

- `Views/MangaListsView/Index.cshtml`: semantic translation hooks and MN List naming.
- `wwwroot/js/mdlists.js`: dynamic translation helpers, language-change rerendering, and translated messages.
- `wwwroot/css/mdlists.css`: shared theme variables and light-mode-safe component styling.
- `wwwroot/locales/en.json` and `vi.json`: complete MN List dictionaries.
- JavaScript contract tests: verify naming, translation coverage, dynamic language handling, and absence of fixed dark page/card/input colors.

## Validation

- Switching VI/EN changes all MN List interface copy immediately.
- Switching light/dark updates the overview, editor, title picker, dropdowns, cards, statuses, and responsive layout.
- Existing create/edit/delete, fuzzy search, sorting, pagination, and authorization behavior remains unchanged.
- JavaScript syntax checks, all Node tests, all .NET tests, and the Release build remain green.
