# MDList Reliability and Fuzzy Search Design

## Goal

Bring the MDList overview and editor closer to the supplied MangaDex references, make create/edit/delete reliable, and let users find titles with partial, accent-insensitive, and minor-typo queries.

## Scope

- Keep the existing ASP.NET Core MVC, Razor, EF Core, and vanilla JavaScript architecture.
- Preserve `/lists` and the existing shared header, sidebar, and authentication modal.
- Improve only the MDList experience and the catalog search contract it needs.
- Do not add a frontend framework or a separate search service.

## User Experience

### Overview

- Show a `My MDLists` tab treatment, a full-width dashed `New MDList` action, and a consistent empty state.
- Render existing lists as wide dark cards with owner, visibility, cover previews, title count, and an action menu.
- The action menu exposes Edit and Delete. Delete requires confirmation and reports success or failure.
- Signed-out visitors retain the page shell and are prompted to sign in when they attempt a protected action.

### Create and Edit

- Use the same editor for create and edit.
- Support name, description, Public/Private visibility, and selected manga.
- Disable the primary action while saving and show validation or API errors in the editor.
- Create saves list metadata and selected items atomically.
- Edit computes additions and removals and persists the final selected set atomically.
- Cancel returns to the overview without persisting local editor changes.

### Title Picker

- Debounce search input and cancel or ignore stale responses.
- Search across the complete catalog with server-side pagination.
- Rank exact matches first, then normalized partial matches, then minor typo matches.
- Normalization is case-insensitive and accent-insensitive.
- All displayed sorts work: best match, upload date, title, rating, follows, catalog-added date, and release year in both required directions.
- Provide list, compact, and grid views plus loading, empty, error, and load-more states.
- Already-selected titles are visibly selected and cannot be added twice.

## Backend Design

### MDList persistence

- Add a request contract containing name, description, visibility, and the final ordered manga ID list.
- Validate trimmed name length, description length, duplicate IDs, and manga existence before changing data.
- Create/update the list and its items inside one database transaction.
- Ownership checks run before exposing or mutating private list data.
- Delete relies on the configured cascade for list items and remains owner-only.
- Item membership checks verify that the requested list belongs to the current user.

Existing item endpoints remain compatible for other callers, but the editor uses the atomic aggregate endpoint.

### Fuzzy catalog search

- Extend the catalog query with a fuzzy-search mode used by the picker.
- Fetch a bounded candidate set using SQL-compatible title, alternative-title, and author matching.
- Normalize candidate strings and the query in application code by lowercasing, decomposing Unicode, and removing combining marks.
- Rank candidates using exact, prefix, substring, token, and bounded edit-distance scores.
- Apply deterministic secondary ordering and paginate the ranked result.
- Blank searches use the requested ordinary catalog sort and do not perform fuzzy scoring.

## Security and Failure Handling

- Every private-list read or mutation checks session ownership.
- User-provided text is HTML-escaped and image URLs are assigned safely rather than interpolated as untrusted markup.
- API failures return meaningful status codes and messages.
- The frontend keeps the editor open after failure, re-enables controls, and displays the failure instead of silently returning.
- Atomic persistence prevents partially created lists.

## Testing

- Backend tests cover create/update transactions, ownership, validation, item synchronization, and fuzzy ranking/normalization.
- JavaScript tests cover payload construction, selected-item diffs/state, all sort mappings, pagination, stale search responses, menus, and visible error handling.
- Source contract tests remain only for structural MVC requirements.
- Verification includes focused tests, the complete Node suite, the complete .NET suite, JavaScript syntax checks, and a Release build.

## Success Criteria

- Create reliably produces one list containing exactly the selected manga.
- Edit reliably persists metadata, additions, removals, and order.
- Delete works only for the owner.
- Every sort option changes the query or ordering as labeled.
- Fuzzy search finds case/accent variants, partial names, and minor typos across paginated results.
- The empty and populated overview states visually match the supplied references while remaining responsive.
- All existing and new automated checks pass.
