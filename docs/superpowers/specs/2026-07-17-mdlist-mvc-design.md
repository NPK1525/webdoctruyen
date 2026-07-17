# MDList MVC Design

## Scope

Rebuild the user's MDList experience in MVC using the supplied MangaDex-style states:

- My MDLists only; no Followed MDLists tab.
- List overview with a New MDList action and list cards.
- Create/edit screen with name, description, Public/Private visibility, title picker, Cancel, and Save/Create.
- Title picker with search, sort dropdown, and list/compact/grid view controls.
- Legacy `/lists.html` redirects to `/lists`.

## Architecture

- Add `MangaListsViewController` and `Views/MangaListsView/Index.cshtml` using `_Header`, `_Sidebar`, and `_AuthModal`.
- Keep existing `/api/mangalist` persistence endpoints and add only the missing title-search contract if the current manga API cannot provide it.
- Replace the static `lists.js` page coordinator with a focused MVC page module that owns overview, editor, visibility dropdown, title picker, sorting, and pagination state.
- Preserve the existing dark theme, orange accent, spacing, and responsive behavior; no unrelated navigation changes.

## Behavior

- Unauthenticated users see the existing login prompt.
- Create and edit use the same editor surface; edit loads the selected list and its items.
- Visibility is a custom dropdown with exactly Public and Private options, persisted as `isPublic`.
- Add titles opens a search panel. Search results are fetched from the catalog API, sorted client-side using Best Match, Latest Upload, Oldest Upload, Title Ascending/Descending, Highest/Lowest Rating, Most/Fewest Follows, Recently/Oldest Added, and Year Ascending/Descending.
- Selecting a title adds it through the existing list-item API; selected titles are shown in the editor and can be removed before save where supported.
- Empty states match the screenshots and use localized strings where available.

## Validation

- Source-contract tests cover MVC partials, legacy redirect, visibility options, title picker, and all sort values.
- JavaScript tests cover search debounce, sorting, selection, and create/edit payloads.
- Existing JavaScript and .NET suites must remain green.
