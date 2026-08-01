# Chapter View Count Design

## Goal

Track and display a separate read count for every chapter while preserving the existing manga-wide total.

## Data model

`Chapter` gains a non-nullable integer `ViewCount` with a database default of `0`. Existing chapters therefore start at zero because historical manga totals cannot be split accurately among chapters. `Manga.ViewCount` remains unchanged and continues to represent the total reads recorded for the title.

## Counting flow

The existing `POST /api/manga/{mangaId}/view?chapterId={chapterId}` endpoint validates that the chapter belongs to the manga. The current session key continues to prevent duplicate counting of the same chapter during one browser session. On the first valid read, the endpoint increments both `Manga.ViewCount` and the matching `Chapter.ViewCount`, then returns both values.

## Read APIs and UI

Manga detail responses and the server-injected detail payload include `viewCount` for every chapter. The detail chapter list displays that value beside an eye icon. Followed Updates and Latest Updates obtain the count from `Chapter.ViewCount`, never from `Manga.ViewCount`, so different chapters can show different values.

## Compatibility and failure handling

- Existing manga totals are preserved.
- Existing chapter counts begin at zero.
- Invalid manga/chapter pairs remain rejected without incrementing either record.
- Existing session deduplication behavior remains unchanged.
- The migration is reversible by dropping the chapter column.

## Verification

Automated tests cover the new model field, migration default, per-chapter query projection, endpoint increment behavior, detail payload, and frontend rendering. The full JavaScript suite, backend test suite, and Release build must pass.
