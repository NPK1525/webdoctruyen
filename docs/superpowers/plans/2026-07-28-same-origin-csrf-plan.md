# Same-Origin CSRF Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unused CORS support and require a valid ASP.NET Core antiforgery token for every unsafe browser request.

**Architecture:** Enable global automatic antiforgery validation, expose a safe token endpoint, and centralize token acquisition in `apiFetch`. Use an integration test against the real middleware pipeline to prove rejection and acceptance.

**Tech Stack:** ASP.NET Core antiforgery, session cookies, JavaScript Fetch API, `Microsoft.AspNetCore.Mvc.Testing`, xUnit, Node.js built-in test runner.

## Global Constraints

- The browser application is same-origin on port 5274.
- Header name: `X-CSRF-TOKEN`.
- Cookie must be HTTP-only, essential, `SameSite=Strict`, and secure outside development.
- GET/HEAD/OPTIONS/TRACE do not require a token.
- POST/PUT/PATCH/DELETE require a token globally.
- Token-fetch failure must stop the unsafe request.
- FormData requests must not receive a JSON `Content-Type`.
- Do not push to GitHub.

---

### Task 1: Add failing backend integration coverage

**Files:**
- Modify: `backend.Tests/MangaNPK.Tests.csproj`
- Create: `backend.Tests/CsrfIntegrationTests.cs`
- Modify: `backend/Program.cs`

**Interfaces:**
- Consumes: Application entry point `Program`.
- Produces: Integration proof for `/api/security/csrf` and `/api/auth/logout`.

- [ ] **Step 1: Add the test-host package**

Add:

```xml
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.9" />
```

Then run:

```text
dotnet restore backend.Tests/MangaNPK.Tests.csproj
```

- [ ] **Step 2: Expose the entry point to the test host**

Append to `Program.cs`:

```csharp
public partial class Program;
```

Wrap database seeding so the integration host never touches SQL Server:

```csharp
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<MangaDbContext>();
        MangaDbSeeder.Seed(context, builder.Configuration);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"An error occurred while migrating or seeding the database: {ex}");
    }
}
```

- [ ] **Step 3: Write the failing integration tests**

```csharp
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace MangaNPK.Tests;

public sealed class CsrfIntegrationTests : IClassFixture<CsrfIntegrationTests.Factory>
{
    private readonly HttpClient client;

    public CsrfIntegrationTests(Factory factory)
    {
        client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false
        });
    }

    [Fact]
    public async Task UnsafeRequest_WithoutToken_IsRejected()
    {
        var response = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UnsafeRequest_WithIssuedToken_IsAccepted()
    {
        var token = await client.GetFromJsonAsync<CsrfResponse>("/api/security/csrf");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.Add("X-CSRF-TOKEN", token!.Token);
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    public sealed class Factory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) =>
            builder.UseEnvironment("Testing");
    }

    private sealed record CsrfResponse(string Token);
}
```

- [ ] **Step 4: Run and verify RED**

Run:

```text
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --filter "FullyQualifiedName~CsrfIntegrationTests" --verbosity quiet
```

Expected: tests fail because `/api/security/csrf` does not exist and logout accepts a missing token.

---

### Task 2: Configure global antiforgery validation

**Files:**
- Create: `backend/Controllers/SecurityController.cs`
- Modify: `backend/Program.cs`
- Modify: `backend/appsettings.json`
- Test: `backend.Tests/CsrfIntegrationTests.cs`

**Interfaces:**
- Produces: `GET /api/security/csrf -> { token: string }`.
- Produces: Global validation of unsafe MVC/API actions.

- [ ] **Step 1: Add the token endpoint**

```csharp
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers;

[ApiController]
[Route("api/security")]
public sealed class SecurityController(IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet("csrf")]
    public IActionResult GetCsrfToken()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { token = tokens.RequestToken });
    }
}
```

- [ ] **Step 2: Register antiforgery and the global filter**

Change MVC registration:

```csharp
builder.Services.AddControllersWithViews(options =>
    {
        options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
```

Add:

```csharp
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        || builder.Environment.IsEnvironment("Testing")
        ? CookieSecurePolicy.None
        : CookieSecurePolicy.Always;
});
```

Ensure `using Microsoft.AspNetCore.Mvc;` is present.

- [ ] **Step 3: Remove CORS**

Delete `allowedOrigins`, `AddCors`, and `app.UseCors("AllowFrontend")` from `Program.cs`. Delete the entire `AllowedOrigins` array from `appsettings.json`.

- [ ] **Step 4: Run integration tests and verify GREEN**

Run the focused command from Task 1.

Expected: both integration tests pass.

---

### Task 3: Make `apiFetch` CSRF-aware

**Files:**
- Create: `backend.Tests/js/csrf-api-fetch.test.cjs`
- Modify: `backend/wwwroot/js/common.js`

**Interfaces:**
- Produces: `getCsrfToken(): Promise<string>`.
- Produces: `apiFetch(url: string, options?: RequestInit): Promise<Response>`.

- [ ] **Step 1: Write the failing JavaScript contract**

Assert that `common.js` contains:

```js
assert.match(common, /fetch\(['"]\/api\/security\/csrf['"]/);
assert.match(common, /X-CSRF-TOKEN/);
assert.match(common, /POST.*PUT.*PATCH.*DELETE/s);
assert.match(common, /body instanceof FormData/);
assert.match(common, /credentials:\s*['"]same-origin['"]/);
```

Also assert that token-fetch failure resets the cached promise:

```js
assert.match(common, /csrfTokenPromise\s*=\s*null/);
```

- [ ] **Step 2: Run and verify RED**

Run:

```text
node --test backend.Tests/js/csrf-api-fetch.test.cjs
```

Expected: FAIL because `apiFetch` has no token logic.

- [ ] **Step 3: Implement the shared client**

```js
let csrfTokenPromise = null;
const UNSAFE_HTTP_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch('/api/security/csrf', {
      credentials: 'same-origin'
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.token) {
          throw new Error(payload.message || 'Không thể khởi tạo bảo vệ yêu cầu.');
        }
        return payload.token;
      })
      .catch(error => {
        csrfTokenPromise = null;
        throw error;
      });
  }
  return csrfTokenPromise;
}

async function apiFetch(url, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (UNSAFE_HTTP_METHODS.has(method)) {
    headers.set('X-CSRF-TOKEN', await getCsrfToken());
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, method, credentials: 'same-origin', headers });
}
```

- [ ] **Step 4: Run and verify GREEN**

Run the focused Node command from Step 2.

Expected: PASS.

---

### Task 4: Remove unsafe direct Fetch calls

**Files:**
- Modify: `backend.Tests/js/csrf-api-fetch.test.cjs`
- Modify: `backend/wwwroot/js/admin-upload.js`
- Modify: `backend/wwwroot/js/admin-reports.js`
- Inspect every file under: `backend/wwwroot/js/*.js`

**Interfaces:**
- Consumes: CSRF-aware `apiFetch`.
- Produces: No direct unsafe `fetch` calls in browser modules.

- [ ] **Step 1: Add failing targeted assertions**

```js
const upload = fs.readFileSync(path.join(jsRoot, 'admin-upload.js'), 'utf8');
const reports = fs.readFileSync(path.join(jsRoot, 'admin-reports.js'), 'utf8');
assert.doesNotMatch(upload, /\bfetch\s*\(/);
assert.match(upload, /apiFetch\(/);
assert.doesNotMatch(reports, /fetch\([^)]*reports\/['"][\s\S]*method:\s*['"]PATCH['"]/);
assert.match(reports, /apiFetch\('\/api\/reports\/'/);
```

- [ ] **Step 2: Run and verify RED**

Run the focused Node command from Task 3.

Expected: FAIL on upload POST and report PATCH.

- [ ] **Step 3: Migrate uploads and report moderation**

Replace both upload calls with:

```js
const res = await apiFetch(`${API_BASE}/upload`, {
  method: 'POST',
  body: formData
});
```

and:

```js
const res = await apiFetch(`${API_BASE}/upload/multiple`, {
  method: 'POST',
  body: formData
});
```

Replace report PATCH with:

```js
const result = await apiFetch(`/api/reports/${button.dataset.reportId}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: button.dataset.reportAction })
});
```

Inspect every `fetch(` result from:

```text
Get-ChildItem backend/wwwroot/js -File -Filter *.js | Select-String -Pattern '\bfetch\s*\('
```

Every remaining direct fetch must be GET/read-only or the internal CSRF token request.

- [ ] **Step 4: Run all security tests**

Run:

```text
node --test backend.Tests/js/csrf-api-fetch.test.cjs backend.Tests/js/admin-module-contract.test.cjs backend.Tests/js/admin-report-pagination.test.cjs
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --filter "FullyQualifiedName~CsrfIntegrationTests" --verbosity quiet
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

Expected: all tests pass; build has 0 warnings and 0 errors.

- [ ] **Step 6: Commit**

```text
git add backend/Program.cs backend/appsettings.json backend/Controllers/SecurityController.cs backend/wwwroot/js/common.js backend/wwwroot/js/admin-upload.js backend/wwwroot/js/admin-reports.js backend.Tests/MangaNPK.Tests.csproj backend.Tests/CsrfIntegrationTests.cs backend.Tests/js/csrf-api-fetch.test.cjs
git commit -m "feat: enforce same-origin CSRF protection"
```

