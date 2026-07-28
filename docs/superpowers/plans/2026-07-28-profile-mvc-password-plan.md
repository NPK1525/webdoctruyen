# Profile MVC and Password Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static profile shell with a shared MVC page and make every profile password requirement consistently require 8 characters containing a letter and a number.

**Architecture:** Add a dedicated MVC controller and Razor view while retaining `profile.js` and the existing profile API. Redirect the legacy static URL, update shared account links, then remove `profile.html`.

**Tech Stack:** ASP.NET Core MVC/Razor, JavaScript, JSON locale dictionaries, xUnit, Node.js built-in test runner.

## Global Constraints

- Canonical profile URL: `/profile`.
- Legacy `/profile.html` must redirect to `/profile`.
- Reuse `_Header`, `_Sidebar`, and `_AuthModal`.
- Keep the current profile API and avatar/email rules.
- Password rule: 8-128 characters, with at least one letter and one number.
- Do not redesign the profile layout.
- Do not push to GitHub.

---

### Task 1: Characterize the MVC profile contract

**Files:**
- Create: `backend.Tests/js/profile-mvc-contract.test.cjs`
- Modify: `backend.Tests/LegacyRouteRedirectTests.cs`

**Interfaces:**
- Consumes: `LegacyRouteRedirect.Resolve(string?, string?, string?)`.
- Produces: Contract for `ProfileViewController`, `Views/ProfileView/Index.cshtml`, `/profile`, and the legacy redirect.

- [ ] **Step 1: Write the failing JavaScript contract test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backend = path.resolve(__dirname, '../../backend');
const controllerPath = path.join(backend, 'Controllers/ProfileViewController.cs');
const viewPath = path.join(backend, 'Views/ProfileView/Index.cshtml');
const profileScript = fs.readFileSync(path.join(backend, 'wwwroot/js/profile.js'), 'utf8');
const common = fs.readFileSync(path.join(backend, 'wwwroot/js/common.js'), 'utf8');

test('profile uses the shared MVC shell at the canonical route', () => {
  assert.equal(fs.existsSync(controllerPath), true);
  assert.equal(fs.existsSync(viewPath), true);
  const controller = fs.readFileSync(controllerPath, 'utf8');
  const view = fs.readFileSync(viewPath, 'utf8');
  assert.match(controller, /HttpGet\(\"\/profile\"\)/);
  for (const partial of ['_Header', '_Sidebar', '_AuthModal']) {
    assert.match(view, new RegExp(`PartialAsync\\(\"${partial}\"\\)`));
  }
  assert.match(view, /\/js\/profile\.js\?v=/);
  assert.match(profileScript, /\/api\/userprofile|API_BASE.*userprofile/s);
});

test('legacy static profile is removed and shared links use the canonical URL', () => {
  assert.equal(fs.existsSync(path.join(backend, 'wwwroot/profile.html')), false);
  assert.doesNotMatch(common, /\/profile\.html/);
  assert.match(common, /href="\/profile"/);
});
```

- [ ] **Step 2: Change the legacy route expectation**

Replace the current assertion that `/profile.html` is ignored:

```csharp
[InlineData("/profile.html", null, null, "/profile")]
```

and keep a non-legacy assertion such as:

```csharp
Assert.Null(LegacyRouteRedirect.Resolve("/profile", null, null));
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```text
node --test backend.Tests/js/profile-mvc-contract.test.cjs
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --filter "FullyQualifiedName~LegacyRouteRedirectTests" --verbosity quiet
```

Expected: JavaScript test fails because the controller/view do not exist; xUnit fails because `/profile.html` is not redirected.

---

### Task 2: Add the MVC route and shared profile shell

**Files:**
- Create: `backend/Controllers/ProfileViewController.cs`
- Create: `backend/Views/ProfileView/Index.cshtml`
- Modify: `backend/Services/LegacyRouteRedirect.cs`
- Modify: `backend/wwwroot/js/common.js`
- Delete: `backend/wwwroot/profile.html`

**Interfaces:**
- Consumes: Shared partials and `/js/profile.js`.
- Produces: `GET /profile` and redirect `/profile.html -> /profile`.

- [ ] **Step 1: Add the controller**

```csharp
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers;

public sealed class ProfileViewController : Controller
{
    [HttpGet("/profile")]
    public IActionResult Index() => View();
}
```

- [ ] **Step 2: Create the Razor view**

Use the exact committed page as the source of truth:

```text
git show c9aa175:backend/wwwroot/profile.html
```

Create `Views/ProfileView/Index.cshtml` from that content. Add `@{ Layout = null; }` before the doctype. Replace the page-owned header, sidebar, and auth-modal blocks—without rebuilding or editing the profile `<main>` block—with these partial calls:

```cshtml
@await Html.PartialAsync("_Header")
@await Html.PartialAsync("_Sidebar")
@await Html.PartialAsync("_AuthModal")
```

Normalize all stylesheet/script URLs to start with `/`, set the shared stylesheet to `/css/style.css?v=4.9`, set `/js/common.js?v=5.8`, and set `/js/profile.js?v=1.3`. The unchanged main block must retain every ID consumed by `profile.js`: `profile-loading-spinner`, `profile-main-content`, `profile-not-logged-in`, `profile-login-btn`, `edit-profile-form`, `change-password-form`, profile display fields, and all password fields.

- [ ] **Step 3: Add the legacy redirect**

Add before the final `return null` in `LegacyRouteRedirect.Resolve`:

```csharp
if (string.Equals(path, "/profile.html", StringComparison.OrdinalIgnoreCase))
{
    return "/profile";
}
```

- [ ] **Step 4: Update shared links and remove the static shell**

Change both `href="/profile.html"` occurrences in `common.js` to `href="/profile"`, then delete `backend/wwwroot/profile.html`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the two commands from Task 1.

Expected: both commands pass.

---

### Task 3: Make the password rule consistent

**Files:**
- Modify: `backend.Tests/js/profile-copy-i18n.test.cjs`
- Modify: `backend/Views/ProfileView/Index.cshtml`
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`
- Modify: profile-reading paths in:
  - `backend.Tests/js/admin-user-security.test.cjs`
  - `backend.Tests/js/avatar-sync.test.cjs`
  - `backend.Tests/js/common-auth-contract.test.cjs`
  - `backend.Tests/js/common-library-contract.test.cjs`
  - `backend.Tests/js/password-reset-otp.test.cjs`

**Interfaces:**
- Consumes: `AuthService.IsValidPassword` and `profile.js` validation.
- Produces: Consistent HTML and locale contract.

- [ ] **Step 1: Extend the failing profile test**

Read `Views/ProfileView/Index.cshtml` instead of `wwwroot/profile.html`, then assert:

```js
for (const id of ['new-password', 'confirm-password']) {
  const input = profileHtml.match(new RegExp(`<input[^>]+id="${id}"[^>]*>`))?.[0] || '';
  assert.match(input, /minlength="8"/);
  assert.match(input, /maxlength="128"/);
}
assert.equal(vi['profile.passwordTooShort'], 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.');
assert.equal(en['profile.passwordTooShort'], 'Password must be at least 8 characters and include a letter and a number.');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```text
node --test backend.Tests/js/profile-copy-i18n.test.cjs
```

Expected: FAIL on `minlength="6"` and the old 6-character locale copy.

- [ ] **Step 3: Implement the exact HTML and locale rules**

Both fields:

```html
minlength="8" maxlength="128"
```

Locale values:

```json
"profile.passwordTooShort": "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số."
```

```json
"profile.passwordTooShort": "Password must be at least 8 characters and include a letter and a number."
```

Update every existing JavaScript test listed above to read the Razor view path while preserving its original assertions.

- [ ] **Step 4: Run all profile and auth tests**

Run:

```text
node --test backend.Tests/js/profile-mvc-contract.test.cjs backend.Tests/js/profile-copy-i18n.test.cjs backend.Tests/js/admin-user-security.test.cjs backend.Tests/js/avatar-sync.test.cjs backend.Tests/js/common-auth-contract.test.cjs backend.Tests/js/common-library-contract.test.cjs backend.Tests/js/password-reset-otp.test.cjs
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --filter "FullyQualifiedName~LegacyRouteRedirectTests|FullyQualifiedName~UserProfile" --verbosity quiet
```

Expected: all focused tests pass.

- [ ] **Step 5: Run the complete gate**

Run:

```text
node --test backend.Tests/js
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore --verbosity quiet
dotnet build backend/MangaNPK.csproj -c Release --no-restore --verbosity quiet
git diff --check
```

Expected: all tests pass; build has 0 warnings and 0 errors; no whitespace errors.

- [ ] **Step 6: Commit**

```text
git add backend/Controllers/ProfileViewController.cs backend/Views/ProfileView/Index.cshtml backend/Services/LegacyRouteRedirect.cs backend/wwwroot/js/common.js backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json backend/wwwroot/profile.html backend.Tests/LegacyRouteRedirectTests.cs backend.Tests/js
git commit -m "feat: move profile to shared MVC shell"
```
