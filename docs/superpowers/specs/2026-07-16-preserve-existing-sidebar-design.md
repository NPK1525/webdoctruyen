# Preserve Existing Sidebar Design

## Goal

Keep every page's existing HTML/Razor sidebar markup and visual styling while retaining the cleaned JavaScript modules and shared behavior.

## Root Cause

`common.js` calls `renderUnifiedSidebarDrawer()` during startup. That function assigns a full template to `drawer.innerHTML` even when `#sidebar-drawer` already contains page-owned markup. Once the extracted authentication module is loaded correctly, startup reaches this call and replaces the visible interface.

## Design

- HTML and Razor remain the source of truth for visible sidebar structure.
- `common.js` continues to bind navigation, authentication, language, theme, and sidebar state behavior.
- `renderUnifiedSidebarDrawer()` becomes a fallback renderer: it returns without mutation when the drawer already contains element children.
- The fallback template is used only for an empty `#sidebar-drawer` placeholder.
- No CSS, backend workflow, admin feature, upload feature, or database model changes are included.

## Verification

- A source contract prevents unconditional replacement of existing sidebar markup.
- A DOM behavior test proves existing children survive initialization while an empty drawer receives fallback content.
- Existing JavaScript tests, backend tests, Release build, and browser inspection guard against regressions.
