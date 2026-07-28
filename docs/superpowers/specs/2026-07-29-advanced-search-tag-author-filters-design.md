# Advanced Search Tag, Author, and Artist Filters

## Goal

Extend the existing advanced manga search page with a MangaDex-style tag filter
panel and searchable multi-select filters for authors and artists, while keeping
the current visual language, URL-driven pagination, and existing filters intact.

## User experience

The existing “Show filters” area gains:

- A `Filter tags` control that displays the current mode (`Include any` when no
  tag mode has been selected).
- A popover panel with a tag search field, reset control, helper text, and
  grouped chips for `Format`, `Genre`, `Theme`, and `Content`.
- Each tag cycles through three states on click:
  1. neutral;
  2. included;
  3. excluded;
  4. neutral again.
- Include and exclude states use distinct accent/border treatment and expose an
  accessible pressed state.
- The panel can be dismissed without losing selections; the main reset control
  clears all selections.

Authors and Artists are added as two searchable multi-select controls in the
advanced filter grid. Selected people appear as removable chips. A person with
the `Story & Art` role matches both controls; `Story` matches Authors and `Art`
matches Artists.

All labels, helper text, empty states, and controls use the existing i18n
dictionary. The layout remains usable on narrow screens by stacking filter
controls and making the tag panel scrollable.

## Data flow and URL contract

The frontend keeps filter state in memory and serializes it into the existing
query string before requesting `/api/manga`. Existing parameters remain
unchanged. New parameters are comma-separated lists:

- `includeGenreIds`
- `excludeGenreIds`
- `includeThemeIds`
- `excludeThemeIds`
- `includeFormats`
- `excludeFormats`
- `includeContent`
- `excludeContent`
- `authorIds`
- `artistIds`

The API applies all include filters with AND semantics between groups and OR
semantics within a group. Exclude filters remove any manga matching one of the
excluded values. Author and artist filters are applied against `MangaAuthors`
and role values; `Story & Art` satisfies both role predicates.

The existing `genreId`, `themeId`, and other legacy parameters remain supported
for compatibility with existing callers. The advanced-search page itself uses
the new list parameters.

## Components

1. **Advanced search view**
   - Adds the tag trigger/popover markup and Authors/Artists combobox markup.
   - Adds stable IDs and ARIA attributes for keyboard and screen-reader use.

2. **Advanced search controller**
   - Owns filter state, chip rendering, tag-state cycling, popover dismissal,
     URL serialization, reset behavior, and request construction.
   - Reuses the existing `/api/author`, `/api/genre`, and `/api/theme` metadata
     endpoints. Format and content options are static enum/string definitions
     already used by the current search form.

3. **Manga API**
   - Parses the new repeated ID/content parameters.
   - Applies include/exclude predicates before count, sorting, and pagination.
   - Returns the same manga result shape used by the current page.

4. **Shared styling and localization**
   - Adds responsive popover/chip/combobox styles using existing theme
     variables.
   - Adds Vietnamese and English strings without introducing a second color
     system.

## Validation

Automated coverage will include:

- tag state cycle and reset;
- filtering tag results by search text;
- author/artist selection and role mapping;
- query-string serialization and restoration;
- reset clearing all new and existing filters;
- backend include/exclude and role predicates;
- pagination counts after filtering;
- Vietnamese/English dictionary parity;
- JavaScript syntax, full JS tests, backend tests, and Release build.

## Out of scope

- Changing manga card layouts or result rendering.
- Replacing the existing sort/type/status/year/rating controls.
- Adding a separate admin taxonomy editor for this search feature.
- Server-side author search pagination; the current catalog size is handled by
  the existing metadata endpoint and can be optimized later if needed.
