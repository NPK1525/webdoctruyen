# Complete Advanced Tag Filter Design

## Goal

Make the advanced-search tag filter expose the complete tag catalog used by
the manga creation form without translating the tag names themselves.

## Scope

- Show every available Format, Genre, Theme, and Content tag in the existing
  scrollable tag panel.
- Continue loading Genre and Theme from the existing `/api/genre` and
  `/api/theme` endpoints so creation and search use the same database records.
- Keep tag names in English in both Vietnamese and English interface modes.
- Continue translating only surrounding interface copy such as group headings,
  instructions, buttons, and empty states.
- Preserve the existing include → exclude → neutral selection cycle and query
  serialization.
- Preserve the eight-result limit for author and artist suggestions.

## Design

The current `filterOptions` helper always truncates results to eight entries.
That limit is useful for author and artist autocomplete results but incorrectly
hides most taxonomy tags.

The helper will accept an optional result limit:

- Tag rendering calls it without a limit and receives every matching tag.
- Author and artist rendering calls it with a limit of eight.
- Searching tags filters the complete catalog rather than a pre-truncated
  subset.

No new API, database table, or duplicate static Genre/Theme catalog will be
introduced. Format and Content remain the fixed canonical values already
supported by the manga query API.

## Error Handling

Existing behavior remains unchanged: if a metadata endpoint fails, that group
renders its localized empty state. Other groups continue to work.

## Verification

- A unit test proves tag filtering returns all matching entries.
- A unit test proves people autocomplete still returns at most eight entries.
- Existing include/exclude serialization tests remain green.
- The full JavaScript suite and backend build must pass.
