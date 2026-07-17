# Followed Updates MVC Design

## Goal

Restore the personalized **Updates** navigation that shows new chapters from every manga in the signed-in user's Library, while keeping **Latest Updates** as the global chapter feed.

## Routes and navigation

- `GET /follow-updates` serves the personalized MVC page.
- Sidebar item `nav-updates-btn` navigates to `/follow-updates`.
- Sidebar item `nav-latest-updates-btn` continues to navigate to `/updates`.
- Active sidebar state is derived from the current route rather than stale session storage.

## Data flow

- The controller reads `UserId` from the authenticated session.
- When no authenticated user exists, the view renders the standard login-required state and does not query personalized data.
- For an authenticated user, query chapters whose `MangaId` belongs to any `UserMangaLibrary` row for that user, regardless of reading status.
- Include manga metadata needed by the existing update cards.
- Order chapters by `UploadedAt` descending and apply a bounded result limit consistent with the global updates page.
- Project the result before materialization and use no-tracking queries.

## UI

- Use the MVC `_Header`, `_Sidebar`, and `_AuthModal` partials.
- Reuse the existing Updates page layout and client renderer to preserve the current interface.
- Use a personalized title and empty-state message.
- Do not add notification UI or restore removed report/subscription items.

## Error and empty states

- Signed-out users see a login prompt.
- Users with no Library entries or no chapters see an empty personalized-updates state.
- Database failures follow the application's standard MVC error handling; no client-side global-feed fallback is used because that would show incorrect data.

## Tests

- Controller/query tests verify that only chapters from the current user's Library are returned and all reading statuses are included.
- Navigation contract tests verify that personalized and global update buttons use different routes.
- Existing JavaScript and .NET suites must remain green.
