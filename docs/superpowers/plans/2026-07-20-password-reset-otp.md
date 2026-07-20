# Password Reset OTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure email-OTP flow that lets signed-out users reset a forgotten password from the shared authentication modal.

**Architecture:** Store only hashes of OTPs and reset tokens in SQL Server, and isolate request/verify/reset rules in a scoped `PasswordResetService`. Deliver messages through an injectable SMTP sender configured by environment variables, while `AuthController` exposes three small API endpoints and the shared modal drives the client flow.

**Tech Stack:** ASP.NET Core MVC on .NET 10, Entity Framework Core 10 with SQL Server, `System.Net.Mail`, BCrypt, vanilla JavaScript, Node test runner, xUnit.

## Global Constraints

- OTP is six numeric digits generated with a cryptographic RNG and expires after 10 minutes.
- A request allows at most 5 failed OTP attempts and resend is limited to once every 60 seconds.
- Reset tokens expire after 10 minutes, are single-use, and both OTPs and reset tokens are stored only as SHA-256 hashes.
- Forgot-password responses must not disclose whether an email address exists.
- Locked accounts cannot reset passwords.
- SMTP secrets must come from configuration/environment variables and must never be committed.
- The new password must pass the existing `AuthService.IsValidPassword` policy and be stored with `AuthService.HashPassword`.

---

### Task 1: Persist password-reset requests

**Files:**
- Create: `backend/Models/PasswordResetRequest.cs`
- Modify: `backend/Models/User.cs`
- Modify: `backend/Data/MangaDbContext.cs`
- Create: `backend/Migrations/<timestamp>_AddPasswordResetRequests.cs`
- Create: `backend/Migrations/<timestamp>_AddPasswordResetRequests.Designer.cs`
- Modify: `backend/Migrations/MangaDbContextModelSnapshot.cs`
- Test: `backend.Tests/PasswordResetModelTests.cs`

**Interfaces:**
- Produces: `DbSet<PasswordResetRequest> PasswordResetRequests` and a `PasswordResetRequest` entity related to `User` with cascade delete.

- [ ] **Step 1: Write the failing model test**

```csharp
[Fact]
public void PasswordResetRequest_ContainsSecurityState()
{
    var type = typeof(PasswordResetRequest);
    foreach (var property in new[] { "UserId", "OtpHash", "ExpiresAt", "FailedAttempts", "ResetTokenHash", "ResetTokenExpiresAt", "ConsumedAt" })
        Assert.NotNull(type.GetProperty(property));
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~PasswordResetModelTests --no-restore`

Expected: FAIL because `PasswordResetRequest` does not exist.

- [ ] **Step 3: Add the entity and EF mapping**

```csharp
public sealed class PasswordResetRequest
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string OtpHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime LastSentAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? ResetTokenHash { get; set; }
    public DateTime? ResetTokenExpiresAt { get; set; }
    public DateTime? ConsumedAt { get; set; }
}
```

Configure max lengths of 64 for hashes, an index on `{ UserId, CreatedAt }`, and cascade delete from `User`.

- [ ] **Step 4: Generate the EF migration**

Run: `dotnet ef migrations add AddPasswordResetRequests --project backend/MangaNPK.csproj --startup-project backend/MangaNPK.csproj`

Expected: migration creates `PasswordResetRequests`, its foreign key, and its lookup index.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~PasswordResetModelTests --no-restore`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/Models backend/Data/MangaDbContext.cs backend/Migrations backend.Tests/PasswordResetModelTests.cs
git commit -m "feat: add password reset request model"
```

### Task 2: Add SMTP delivery behind an interface

**Files:**
- Create: `backend/Services/Email/EmailMessage.cs`
- Create: `backend/Services/Email/IEmailSender.cs`
- Create: `backend/Services/Email/SmtpEmailSender.cs`
- Create: `backend/Services/Email/SmtpOptions.cs`
- Modify: `backend/Program.cs`
- Modify: `backend/appsettings.json`
- Test: `backend.Tests/EmailSenderArchitectureTests.cs`

**Interfaces:**
- Produces: `Task IEmailSender.SendAsync(EmailMessage message, CancellationToken cancellationToken)`.
- Produces: `SmtpOptions` bound from the `Smtp` configuration section.

- [ ] **Step 1: Write the failing architecture test**

```csharp
[Fact]
public void SmtpSender_DependsOnOptionsAndImplementsContract()
{
    Assert.Contains(typeof(IEmailSender), typeof(SmtpEmailSender).GetInterfaces());
    Assert.NotNull(typeof(SmtpOptions).GetProperty("Host"));
    Assert.NotNull(typeof(SmtpOptions).GetProperty("Password"));
}
```

- [ ] **Step 2: Run the test and verify RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~EmailSenderArchitectureTests --no-restore`

Expected: FAIL because the email types are missing.

- [ ] **Step 3: Implement the SMTP adapter and registration**

```csharp
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

public sealed record EmailMessage(string To, string Subject, string HtmlBody);
```

Bind `SmtpOptions` with `Host`, `Port`, `EnableSsl`, `Username`, `Password`, `FromAddress`, and `FromName`. Validate required options inside `SmtpEmailSender.SendAsync`, construct `MailMessage`, and use `SmtpClient.SendMailAsync(message, cancellationToken)`. Register with `AddOptions<SmtpOptions>().BindConfiguration("Smtp")` and `AddScoped<IEmailSender, SmtpEmailSender>()`.

- [ ] **Step 4: Add non-secret defaults**

```json
"Smtp": {
  "Host": "",
  "Port": 587,
  "EnableSsl": true,
  "Username": "",
  "Password": "",
  "FromAddress": "",
  "FromName": "MangaNPK"
}
```

Production/local secrets use environment names such as `Smtp__Host`, `Smtp__Username`, and `Smtp__Password`.

- [ ] **Step 5: Run the test and verify GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~EmailSenderArchitectureTests --no-restore`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/Services/Email backend/Program.cs backend/appsettings.json backend.Tests/EmailSenderArchitectureTests.cs
git commit -m "feat: add configurable smtp email sender"
```

### Task 3: Implement OTP request, verification, and reset rules

**Files:**
- Create: `backend/Contracts/Auth/PasswordResetDtos.cs`
- Create: `backend/Services/PasswordResetService.cs`
- Modify: `backend/Program.cs`
- Test: `backend.Tests/PasswordResetServiceTests.cs`

**Interfaces:**
- Consumes: `MangaDbContext`, `IEmailSender`, and `TimeProvider`.
- Produces: `RequestOtpAsync(string email, CancellationToken)`, `VerifyOtpAsync(string email, string otp, CancellationToken)`, and `ResetPasswordAsync(string email, string resetToken, string password, string confirmPassword, CancellationToken)`.
- Produces: result records with `Succeeded`, `Error`, and optional `ResetToken` without returning the OTP.

- [ ] **Step 1: Write failing service tests**

Create tests using EF InMemory, a fake `IEmailSender`, and a fixed `TimeProvider`. Cover:

```csharp
[Fact] public async Task RequestOtp_StoresHashAndEmailsSixDigits() { /* assert sent body contains six digits and database does not */ }
[Fact] public async Task RequestOtp_UnknownEmailReturnsGenericSuccessWithoutEmail() { /* no enumeration */ }
[Fact] public async Task VerifyOtp_FiveFailuresInvalidatesRequest() { /* sixth attempt rejected */ }
[Fact] public async Task VerifyOtp_ExpiredCodeIsRejected() { /* advance clock by 11 minutes */ }
[Fact] public async Task ResetPassword_ConsumesTokenAndChangesHash() { /* token cannot be reused */ }
[Fact] public async Task LockedUser_DoesNotReceiveOtp() { /* generic result, zero messages */ }
```

- [ ] **Step 2: Run the service tests and verify RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~PasswordResetServiceTests --no-restore`

Expected: FAIL because `PasswordResetService` is missing.

- [ ] **Step 3: Implement minimal service logic**

Use `RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6")`, hash with SHA-256, and compare decoded hash bytes with `CryptographicOperations.FixedTimeEquals`. Invalidate previous active requests before storing a new one. Enforce 60-second resend cooldown, 10-minute lifetimes, 5 attempts, single-use consumption, locked-account rejection, and existing password validation.

Register:

```csharp
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<PasswordResetService>();
```

- [ ] **Step 4: Run service tests and verify GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~PasswordResetServiceTests --no-restore`

Expected: all password-reset service tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/Contracts/Auth backend/Services/PasswordResetService.cs backend/Program.cs backend.Tests/PasswordResetServiceTests.cs
git commit -m "feat: implement password reset otp service"
```

### Task 4: Expose password-reset API endpoints

**Files:**
- Modify: `backend/Controllers/AuthController.cs`
- Test: `backend.Tests/PasswordResetControllerTests.cs`
- Test: `backend.Tests/AdminControllerArchitectureTests.cs`

**Interfaces:**
- Consumes: `PasswordResetService` from Task 3.
- Produces: `POST /api/auth/forgot-password`, `POST /api/auth/verify-reset-otp`, and `POST /api/auth/reset-password`.

- [ ] **Step 1: Write failing controller tests**

```csharp
[Theory]
[InlineData("forgot-password")]
[InlineData("verify-reset-otp")]
[InlineData("reset-password")]
public void AuthController_DefinesPasswordResetRoute(string route)
{
    Assert.Contains(typeof(AuthController).GetMethods(), method =>
        method.GetCustomAttributes<HttpPostAttribute>().Any(attribute => attribute.Template == route));
}
```

Add behavior assertions that generic request responses use the same status/message for known and unknown emails, validation errors return 400, and SMTP failure for a known account returns 503 without configuration details.

- [ ] **Step 2: Run controller tests and verify RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~PasswordResetControllerTests --no-restore`

Expected: FAIL because routes are missing.

- [ ] **Step 3: Add thin endpoints**

```csharp
[HttpPost("forgot-password")]
public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto, CancellationToken ct) { /* delegate and map result */ }

[HttpPost("verify-reset-otp")]
public async Task<IActionResult> VerifyResetOtp(VerifyResetOtpDto dto, CancellationToken ct) { /* delegate and map result */ }

[HttpPost("reset-password")]
public async Task<IActionResult> ResetPassword(ResetPasswordDto dto, CancellationToken ct) { /* delegate and map result */ }
```

Return Vietnamese messages, never include OTP/hash/configuration, and apply the current IP limiter to these API requests via the existing middleware.

- [ ] **Step 4: Run controller tests and verify GREEN**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~PasswordResetControllerTests --no-restore`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/Controllers/AuthController.cs backend.Tests/PasswordResetControllerTests.cs backend.Tests/AdminControllerArchitectureTests.cs
git commit -m "feat: expose password reset otp api"
```

### Task 5: Add the shared forgot-password interface

**Files:**
- Modify: `backend/Views/Shared/_AuthModal.cshtml`
- Modify: `backend/wwwroot/js/common-auth.js`
- Modify: `backend/wwwroot/css/style.css`
- Test: `backend.Tests/js/password-reset-otp.test.cjs`

**Interfaces:**
- Consumes: the three `/api/auth/*` endpoints from Task 4.
- Produces: modal views `forgot-request`, `forgot-otp`, and `forgot-reset`, with login back-navigation.

- [ ] **Step 1: Write failing UI tests**

```javascript
test('shared auth modal exposes the complete password reset flow', () => {
  for (const id of ['switch-to-forgot', 'forgot-email', 'forgot-otp', 'forgot-new-password', 'forgot-confirm-password'])
    assert.match(view, new RegExp(`id="${id}"`));
  assert.match(js, /\/auth\/forgot-password/);
  assert.match(js, /\/auth\/verify-reset-otp/);
  assert.match(js, /\/auth\/reset-password/);
});
```

- [ ] **Step 2: Run UI test and verify RED**

Run: `node --test backend.Tests/js/password-reset-otp.test.cjs`

Expected: FAIL because the forgot-password views are absent.

- [ ] **Step 3: Add modal markup and state handling**

Add the **Quên mật khẩu?** control beneath the login password field. Add three themed views using existing `.form-group`, `.form-control`, `.btn`, and error styles. Store only email and the returned reset token in module memory; do not use local storage. Disable submit buttons while requests are running, validate matching passwords client-side, show server messages, and return to login after a successful reset.

- [ ] **Step 4: Run UI test and verify GREEN**

Run: `node --test backend.Tests/js/password-reset-otp.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/Views/Shared/_AuthModal.cshtml backend/wwwroot/js/common-auth.js backend/wwwroot/css/style.css backend.Tests/js/password-reset-otp.test.cjs
git commit -m "feat: add password reset otp interface"
```

### Task 6: Document configuration and verify end to end

**Files:**
- Modify: `README.md`
- Modify: `backend/appsettings.json`
- Test: `backend.Tests/js/security-config.test.cjs`

**Interfaces:**
- Consumes: SMTP settings from Task 2.
- Produces: copy-paste-safe environment variable instructions without real credentials.

- [ ] **Step 1: Extend the security configuration test**

Assert tracked configuration contains no non-empty SMTP password and documentation uses placeholders only.

- [ ] **Step 2: Run the security test and verify RED**

Run: `node --test backend.Tests/js/security-config.test.cjs`

Expected: FAIL until SMTP configuration safety is documented/tested.

- [ ] **Step 3: Document local SMTP configuration**

Document `Smtp__Host`, `Smtp__Port`, `Smtp__EnableSsl`, `Smtp__Username`, `Smtp__Password`, `Smtp__FromAddress`, and `Smtp__FromName`; explain that Gmail requires an app password and that secrets belong in environment variables or user secrets.

- [ ] **Step 4: Run focused and complete verification**

Run:

```powershell
node --test backend.Tests/js/password-reset-otp.test.cjs backend.Tests/js/security-config.test.cjs
dotnet test backend.Tests/MangaNPK.Tests.csproj --filter FullyQualifiedName~PasswordReset --no-restore
node --test backend.Tests/js
dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore
dotnet build backend/MangaNPK.csproj --no-restore
git diff --check
```

Expected: all JavaScript tests PASS, all .NET tests PASS, build succeeds with 0 errors and 0 warnings, and `git diff --check` produces no errors.

- [ ] **Step 5: Commit**

```powershell
git add README.md backend/appsettings.json backend.Tests/js/security-config.test.cjs
git commit -m "docs: configure password reset email"
```
