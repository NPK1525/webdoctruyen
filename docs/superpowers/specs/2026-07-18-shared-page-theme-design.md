# Shared Page Theme Design

## Goal

Make Library, Updates, Followed Updates, Reading History, Recently Added, and Advanced Search use the same dark/light theme surfaces as Home while preserving the intentionally darker reader experience.

## Approved approach

Use the existing shared theme variables in `style.css` rather than introducing a second page palette. The `library-page` body background becomes `var(--bg-main)`. Reusable panels, tabs, pagination controls, list cards, and the add-to-library dialog use `--bg-card`, `--bg-card-hover`, `--bg-input`, `--border-subtle`, `--text-main`, and `--text-muted` where they currently contain fixed dark or light colors.

All MVC views that load the shared stylesheet use one cache version so a browser cannot retain different generations of the same `style.css` on different pages. `mdlists.css` remains a separate page stylesheet but continues consuming the same shared variables.

## Scope

- Library
- Updates and Followed Updates
- Reading History
- Recently Added
- Advanced Search
- Shared add-to-library dialog
- Shared `style.css` cache version in MVC views

The manga reader keeps its dedicated `--bg-reader`/dark presentation. Layout, spacing, content, routes, language behavior, and data behavior do not change.

## Theme behavior

Dark mode and light mode both inherit from the variables declared at the top of `style.css`. Page-specific light-mode rules remain only where a component needs a semantic contrast that cannot be represented by an existing shared variable. Text and borders use theme variables so mode changes do not require parallel hard-coded palettes.

## Verification

Add a Node contract test that fails if `.library-page` returns to a fixed background, if core Library surfaces use the known fixed palette, or if the affected views load inconsistent `style.css` versions. Run the focused test red then green, all Node tests, JavaScript syntax checks, .NET tests, a Release build, and browser smoke checks for Home and representative shared pages.
