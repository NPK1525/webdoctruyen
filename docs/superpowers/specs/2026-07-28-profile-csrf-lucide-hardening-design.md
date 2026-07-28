# Profile, CSRF, and Lucide Hardening Design

## Goal

Consolidate the profile page into the shared MVC shell, make password requirements consistent, protect all unsafe same-origin requests with ASP.NET Core antiforgery validation, remove unused cross-origin support, vendor Lucide locally, and preserve a clean Git recovery path.

## Existing Checkpoint

The verified pre-change state is preserved in commit `c9aa175`.

- JavaScript tests: 122 passed.
- .NET tests: 125 passed.
- Release build: 0 warnings and 0 errors.
- `backend/wwwroot/uploads/` was excluded from the commit.

## Scope

### Included

1. Make profile password fields, JavaScript validation, locale copy, and backend validation consistently require at least 8 characters containing both a letter and a number.
2. Replace the last static `profile.html` shell with an MVC profile page that uses the shared header, sidebar, and authentication modal partials.
3. Make `/profile` the canonical profile URL and redirect `/profile.html` to it.
4. Remove unused CORS support for ports 3000 and 5274 because the browser application is same-origin.
5. Add antiforgery validation to every unsafe MVC/API action.
6. Make the shared `apiFetch` function automatically send a CSRF token for POST, PUT, PATCH, and DELETE requests.
7. Migrate remaining unsafe direct `fetch` calls to `apiFetch`.
8. Vendor Lucide 1.27.0 and its license under `wwwroot`.
9. Ignore local user uploads in Git.
10. Create separate verified commits for the profile/password, CSRF, and Lucide changes.

### Excluded

- Replacing the existing profile API with server-rendered profile data.
- Redesigning the profile layout.
- Adding a separate frontend application.
- Adding new account fields or changing avatar rules.
- Deploying or pushing to GitHub.
- Adding a full Content Security Policy.

## Profile and Password Design

Create `ProfileViewController` with a canonical `GET /profile` action. Move the useful body content from `backend/wwwroot/profile.html` into `backend/Views/ProfileView/Index.cshtml`. The MVC page must render `Views/Shared/_Header.cshtml`, `Views/Shared/_Sidebar.cshtml`, and `Views/Shared/_AuthModal.cshtml` directly. It will continue to load `profile.js`, so profile data and updates remain backed by the current `/api/userprofile` endpoints.

Update the profile and settings links in `common.js` from `/profile.html` to `/profile`. Extend `LegacyRouteRedirect` so `/profile.html` redirects temporarily to `/profile`, then delete the static HTML file.

Both new-password fields use `minlength="8"` and `maxlength="128"`. Vietnamese and English locale strings state that passwords require at least 8 characters containing a letter and a number. JavaScript keeps the same rule, while `AuthService.IsValidPassword` remains the final server-side authority.

## Same-Origin and CSRF Design

Remove the CORS service registration, CORS middleware, and `AllowedOrigins` configuration because no separate port-3000 frontend remains.

Register ASP.NET Core antiforgery with:

- Header name: `X-CSRF-TOKEN`.
- Cookie: HTTP-only, `SameSite=Strict`, essential, and secure outside development.

Add an anonymous read-only endpoint at `GET /api/security/csrf`. It calls the framework antiforgery service, stores the cookie token, and returns only the request token.

Apply automatic antiforgery validation globally. Safe GET/HEAD/OPTIONS/TRACE requests remain unaffected. All POST, PUT, PATCH, and DELETE actions—including authentication, OTP, comments, library, ratings, reports, uploads, profile, and admin actions—require a valid token.

Extend `apiFetch` to lazily request and cache a token before the first unsafe request on a page. It adds the token through `X-CSRF-TOKEN` and always uses `credentials: same-origin`. Safe requests do not request a token. Any unsafe direct `fetch` call, including report moderation and uploads, must be routed through `apiFetch`.

A missing or invalid token returns HTTP 400 before controller logic changes application data. Token-fetch failures surface through the caller's existing error handling and must not silently send an unprotected request.

## Local Lucide Design

Vendor the official Lucide 1.27.0 browser bundle and license at:

- `backend/wwwroot/vendor/lucide/lucide.min.js`
- `backend/wwwroot/vendor/lucide/LICENSE`

All current Lucide consumers must load `/vendor/lucide/lucide.min.js?v=1.27.0`. No page may load `unpkg.com/lucide` or use the floating `@latest` tag. The global `lucide.createIcons()` API remains unchanged, so page scripts require no icon-rendering rewrite.

The local bundle is checked into Git. It is not generated during application startup, and the production website requires no third-party network request for icons.

## Git Design

Add `/backend/wwwroot/uploads/` to `.gitignore`; uploaded user content remains local and is not version-controlled.

Implementation is split into independently verifiable commits:

1. Profile MVC conversion and password consistency.
2. Same-origin antiforgery protection.
3. Local Lucide dependency and cleanup.

No push is performed without a later explicit request.

## Verification

### Profile and Password

- `/profile` renders the shared MVC partials.
- `/profile.html` redirects to `/profile`.
- The old static profile file no longer exists.
- Profile and settings links use `/profile`.
- HTML, JavaScript, Vietnamese, English, and backend rules all require 8 characters with a letter and a number.

### CSRF

- An unsafe request without a token returns HTTP 400 and does not change data.
- Fetching `/api/security/csrf` and sending the returned token with its cookie allows the same valid request.
- Safe requests work without a token.
- Every unsafe browser request uses `apiFetch`.
- CORS registration, middleware, and port-3000 origins are absent.

### Lucide

- No HTML or Razor file references `unpkg.com/lucide` or `@latest`.
- Every icon consumer references the same local version.
- The vendored bundle and license exist.
- Existing icon initialization remains functional.

### Final Gate

- All JavaScript contract tests pass.
- All .NET tests pass.
- Release build completes with zero errors and zero warnings.
- `git diff --check` reports no whitespace errors.
- Live checks confirm `/profile` returns HTTP 200 and `/profile.html` redirects to `/profile`.

