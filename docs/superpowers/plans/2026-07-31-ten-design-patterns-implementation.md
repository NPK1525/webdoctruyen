# Ten Design Patterns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung Decorator, Proxy, Factory Method và Command để WebDocTruyen đạt 10/20 GoF patterns mà không thay đổi route, API contract, giao diện hoặc schema database.

**Architecture:** Tách cache page URL thành Decorator; đặt logging proxy trước MangaDex metadata client; chuyển riêng phần khởi tạo entity `Manga` sang bốn concrete creator; chuyển nghiệp vụ cập nhật trạng thái báo cáo thành Command + Handler. Application services tiếp tục quản lý transaction và relationships để giảm tối đa regression.

**Tech Stack:** .NET 10, ASP.NET Core MVC/API, Entity Framework Core 10, SQL Server, xUnit 2.9, JavaScript Node test runner.

## Global Constraints

- Không đổi bất kỳ route hoặc HTTP method nào.
- Không đổi request DTO hoặc JSON response.
- Không sửa `Views/`, `wwwroot/` hoặc migration.
- Không thực hiện HTTP request MangaDex thật trong automated tests.
- Mỗi pattern phải được production code sử dụng; không tạo class minh họa chết.
- Giữ nguyên thời lượng cache page URL là 5 phút.
- Giữ nguyên exception type, cancellation token và transaction boundary.
- Không stage hoặc sửa thư mục `appthoitrang_ascii/`.
- Chỉ commit sau khi targeted tests của task tương ứng đạt.

---

### Task 1: Ghi baseline và contract bất biến

**Files:**
- Create: `backend.Tests/DesignPatternCompatibilityContractTests.cs`
- Verify: `backend.Tests/js/report-api-contract.test.cjs`

**Interfaces:**
- Consumes: các controller và DTO hiện tại.
- Produces: contract tests bảo vệ route, method signature và absence of schema/UI changes.

- [ ] **Step 1: Ghi nhận baseline Git**

Run:

```powershell
git status --short
git diff --name-only
```

Expected: ghi nhận các file tài liệu đang untracked; không đưa `appthoitrang_ascii/` vào phạm vi.

- [ ] **Step 2: Chạy baseline test**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName!~SourceEncodingTests" `
  --verbosity quiet

node --test backend.Tests\js

dotnet build backend\MangaNPK.csproj `
  --configuration Release `
  --no-restore `
  --verbosity quiet
```

Expected:

- Backend hiện tại: 148 tests đạt trước khi thêm test mới.
- JavaScript hiện tại: 176 tests đạt.
- Build: 0 errors.

- [ ] **Step 3: Viết compatibility contract test**

```csharp
using MangaNPK.Controllers;
using MangaNPK.Contracts.Admin;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace MangaNPK.Tests;

public sealed class DesignPatternCompatibilityContractTests
{
    [Fact]
    public void ReportModeration_RouteAndDtoRemainStable()
    {
        var method = typeof(ReportsController).GetMethod(
            nameof(ReportsController.UpdateStatus));
        Assert.NotNull(method);

        var patch = Assert.Single(
            method!.GetCustomAttributes(typeof(HttpPatchAttribute), false)
                .Cast<HttpPatchAttribute>());
        Assert.Equal("{id:int}", patch.Template);

        var parameters = method.GetParameters();
        Assert.Equal(typeof(int), parameters[0].ParameterType);
        Assert.Equal(typeof(UpdateReportDto), parameters[1].ParameterType);
    }

    [Fact]
    public void MangaCreation_RequestContractRemainsStable()
    {
        Assert.Equal(typeof(string), typeof(CreateMangaDto)
            .GetProperty(nameof(CreateMangaDto.Title))!.PropertyType);
        Assert.Equal(typeof(List<MangaAuthorDto>), typeof(CreateMangaDto)
            .GetProperty(nameof(CreateMangaDto.Authors))!.PropertyType);
        Assert.Equal(typeof(List<int>), typeof(CreateMangaDto)
            .GetProperty(nameof(CreateMangaDto.GenreIds))!.PropertyType);
        Assert.Equal(typeof(List<int>), typeof(CreateMangaDto)
            .GetProperty(nameof(CreateMangaDto.ThemeIds))!.PropertyType);
    }
}
```

- [ ] **Step 4: Chạy contract test**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName~DesignPatternCompatibilityContractTests"
```

Expected: PASS trên code trước refactor.

- [ ] **Step 5: Commit baseline contract**

```powershell
git add -- backend.Tests/DesignPatternCompatibilityContractTests.cs
git commit -m "test: lock design pattern compatibility contracts"
```

---

### Task 2: Decorator cho cache MangaDex chapter pages

**Files:**
- Create: `backend/Services/MangaDex/IMangaDexChapterPageService.cs`
- Create: `backend/Services/MangaDex/CachedMangaDexChapterPageService.cs`
- Create: `backend.Tests/CachedMangaDexChapterPageServiceTests.cs`
- Modify: `backend/Services/MangaDexService.cs`
- Modify: `backend/Controllers/ChapterController.cs`
- Modify: `backend/Controllers/ChapterViewController.cs`
- Modify: `backend/Program.cs`

**Interfaces:**
- Produces:

```csharp
Task<List<string>> IMangaDexChapterPageService.GetChapterPageUrlsAsync(
    string chapterExternalId,
    bool dataSaver = false,
    CancellationToken cancellationToken = default);
```

- Consumes: `IMemoryCache`, existing MangaDex At-Home HTTP behavior.

- [ ] **Step 1: Viết failing tests cho Decorator**

```csharp
using MangaNPK.Services;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace MangaNPK.Tests;

public sealed class CachedMangaDexChapterPageServiceTests
{
    [Fact]
    public async Task CacheMiss_DelegatesOnce_ThenCacheHitSkipsInner()
    {
        var expected = new List<string> { "https://uploads.test/1.jpg" };
        var inner = new StubChapterPageService(expected);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var decorator = new CachedMangaDexChapterPageService(inner, cache);

        var first = await decorator.GetChapterPageUrlsAsync("chapter-1");
        var second = await decorator.GetChapterPageUrlsAsync("chapter-1");

        Assert.Same(expected, first);
        Assert.Same(expected, second);
        Assert.Equal(1, inner.CallCount);
    }

    [Fact]
    public async Task DataSaver_UsesIndependentCacheEntry()
    {
        var inner = new StubChapterPageService(["https://uploads.test/1.jpg"]);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var decorator = new CachedMangaDexChapterPageService(inner, cache);

        await decorator.GetChapterPageUrlsAsync("chapter-1", false);
        await decorator.GetChapterPageUrlsAsync("chapter-1", true);

        Assert.Equal(2, inner.CallCount);
    }

    [Fact]
    public async Task InnerException_IsNotConverted()
    {
        var expected = new HttpRequestException("MangaDex unavailable");
        var inner = new ThrowingChapterPageService(expected);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var decorator = new CachedMangaDexChapterPageService(inner, cache);

        var actual = await Assert.ThrowsAsync<HttpRequestException>(
            () => decorator.GetChapterPageUrlsAsync("chapter-1"));

        Assert.Same(expected, actual);
    }

    [Fact]
    public async Task CancellationToken_IsForwarded()
    {
        var inner = new StubChapterPageService([]);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var decorator = new CachedMangaDexChapterPageService(inner, cache);
        using var source = new CancellationTokenSource();

        await decorator.GetChapterPageUrlsAsync(
            "chapter-1",
            cancellationToken: source.Token);

        Assert.Equal(source.Token, inner.LastToken);
    }

    private sealed class StubChapterPageService(List<string> result)
        : IMangaDexChapterPageService
    {
        public int CallCount { get; private set; }
        public CancellationToken LastToken { get; private set; }

        public Task<List<string>> GetChapterPageUrlsAsync(
            string chapterExternalId,
            bool dataSaver = false,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            LastToken = cancellationToken;
            return Task.FromResult(result);
        }
    }

    private sealed class ThrowingChapterPageService(Exception exception)
        : IMangaDexChapterPageService
    {
        public Task<List<string>> GetChapterPageUrlsAsync(
            string chapterExternalId,
            bool dataSaver = false,
            CancellationToken cancellationToken = default) =>
            Task.FromException<List<string>>(exception);
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName~CachedMangaDexChapterPageServiceTests"
```

Expected: FAIL vì interface/decorator chưa tồn tại.

- [ ] **Step 3: Tạo Component interface**

```csharp
namespace MangaNPK.Services;

public interface IMangaDexChapterPageService
{
    Task<List<string>> GetChapterPageUrlsAsync(
        string chapterExternalId,
        bool dataSaver = false,
        CancellationToken cancellationToken = default);
}
```

- [ ] **Step 4: Tạo cache Decorator**

```csharp
using Microsoft.Extensions.Caching.Memory;

namespace MangaNPK.Services;

public sealed class CachedMangaDexChapterPageService(
    IMangaDexChapterPageService inner,
    IMemoryCache cache) : IMangaDexChapterPageService
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private readonly IMangaDexChapterPageService _inner = inner;
    private readonly IMemoryCache _cache = cache;

    public async Task<List<string>> GetChapterPageUrlsAsync(
        string chapterExternalId,
        bool dataSaver = false,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"mangadex-at-home:{chapterExternalId}:{dataSaver}";
        if (_cache.TryGetValue(cacheKey, out List<string>? cached)
            && cached is not null)
        {
            return cached;
        }

        var urls = await _inner.GetChapterPageUrlsAsync(
            chapterExternalId,
            dataSaver,
            cancellationToken);

        _cache.Set(cacheKey, urls, CacheDuration);
        return urls;
    }
}
```

- [ ] **Step 5: Chuyển concrete component**

Trong `MangaDexService.cs`:

```csharp
public class MangaDexService(HttpClient httpClient)
    : IMangaDexChapterPageService
{
    private readonly HttpClient _httpClient = httpClient;
```

Xóa `IMemoryCache` khỏi constructor/field và xóa block cache đầu/cuối của `GetChapterPageUrlsAsync`. Giữ nguyên phần gọi API, parse và tạo URL.

- [ ] **Step 6: Chuyển hai controller sang Component interface**

```csharp
public class ChapterController(
    MangaDbContext context,
    IMangaDexChapterPageService mangaDexChapterPages) : ControllerBase
```

```csharp
public class ChapterViewController(
    MangaDbContext context,
    IMangaDexChapterPageService mangaDexChapterPages) : Controller
```

Chỉ đổi kiểu dependency và tên field; action, route và lời gọi method giữ nguyên.

- [ ] **Step 7: Đăng ký Decorator**

```csharp
builder.Services.AddHttpClient<MangaDexService>();
builder.Services.AddScoped<IMangaDexChapterPageService>(provider =>
    new CachedMangaDexChapterPageService(
        provider.GetRequiredService<MangaDexService>(),
        provider.GetRequiredService<IMemoryCache>()));
```

- [ ] **Step 8: Chạy targeted và regression tests**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName~CachedMangaDexChapterPageServiceTests|FullyQualifiedName~MangaDex"

dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName!~SourceEncodingTests" `
  --verbosity quiet
```

Expected: PASS.

- [ ] **Step 9: Commit Decorator**

```powershell
git add -- backend/Services/MangaDex/IMangaDexChapterPageService.cs backend/Services/MangaDex/CachedMangaDexChapterPageService.cs backend/Services/MangaDexService.cs backend/Controllers/ChapterController.cs backend/Controllers/ChapterViewController.cs backend/Program.cs backend.Tests/CachedMangaDexChapterPageServiceTests.cs
git commit -m "refactor: decorate MangaDex chapter page caching"
```

---

### Task 3: Proxy cho MangaDex metadata requests

**Files:**
- Create: `backend/Services/MangaDex/IMangaDexService.cs`
- Create: `backend/Services/MangaDex/LoggingMangaDexProxy.cs`
- Create: `backend.Tests/LoggingMangaDexProxyTests.cs`
- Modify: `backend/Services/MangaDexService.cs`
- Modify: `backend/Services/MangaDexImportService.cs`
- Modify: `backend/Program.cs`
- Modify: `backend.Tests/MangaDexImportServiceArchitectureTests.cs`

**Interfaces:**
- Produces: `IMangaDexService`.
- Consumes: existing MangaDex preview/feed behavior.

- [ ] **Step 1: Viết failing proxy tests**

Test fake subject phải ghi lại input, cancellation token và call count. Các test bắt buộc:

```csharp
[Fact]
public async Task Preview_ForwardsInputAndReturnsSameResult()
{
    var expected = new MangaDexPreviewDto(
        "manga-id",
        "Title",
        "Alternative",
        "Description",
        "https://uploads.test/cover.jpg",
        MangaType.Manga,
        MangaStatus.Ongoing,
        MangaDemographic.Shounen,
        MangaFormat.WebComic,
        2026,
        [],
        []);
    var inner = new StubMangaDexService { Preview = expected };
    var proxy = new LoggingMangaDexProxy(
        inner,
        NullLogger<LoggingMangaDexProxy>.Instance);
    using var source = new CancellationTokenSource();

    var actual = await proxy.GetMangaPreviewAsync(
        "mangadex-id",
        source.Token);

    Assert.Same(expected, actual);
    Assert.Equal("mangadex-id", inner.PreviewInput);
    Assert.Equal(source.Token, inner.PreviewToken);
    Assert.Equal(1, inner.PreviewCalls);
}

[Fact]
public async Task Chapters_ForwardsAndReturnsSameList()
{
    var expected = new List<MangaDexChapterDto>();
    var inner = new StubMangaDexService { Chapters = expected };
    var proxy = new LoggingMangaDexProxy(
        inner,
        NullLogger<LoggingMangaDexProxy>.Instance);

    var actual = await proxy.GetVietnameseChaptersAsync("manga-id");

    Assert.Same(expected, actual);
    Assert.Equal(1, inner.ChapterCalls);
}

[Fact]
public async Task Exception_IsRethrownWithoutConversion()
{
    var expected = new HttpRequestException("failure");
    var inner = new StubMangaDexService { Exception = expected };
    var proxy = new LoggingMangaDexProxy(
        inner,
        NullLogger<LoggingMangaDexProxy>.Instance);

    var actual = await Assert.ThrowsAsync<HttpRequestException>(
        () => proxy.GetMangaPreviewAsync("manga-id"));

    Assert.Same(expected, actual);
}
```

Test file định nghĩa fake subject đầy đủ:

```csharp
private sealed class StubMangaDexService : IMangaDexService
{
    public MangaDexPreviewDto? Preview { get; init; }
    public List<MangaDexChapterDto>? Chapters { get; init; }
    public Exception? Exception { get; init; }
    public string? PreviewInput { get; private set; }
    public CancellationToken PreviewToken { get; private set; }
    public int PreviewCalls { get; private set; }
    public int ChapterCalls { get; private set; }

    public Task<MangaDexPreviewDto> GetMangaPreviewAsync(
        string input,
        CancellationToken cancellationToken = default)
    {
        PreviewCalls++;
        PreviewInput = input;
        PreviewToken = cancellationToken;
        return Exception is null
            ? Task.FromResult(Preview!)
            : Task.FromException<MangaDexPreviewDto>(Exception);
    }

    public Task<List<MangaDexChapterDto>> GetVietnameseChaptersAsync(
        string mangaId,
        CancellationToken cancellationToken = default)
    {
        ChapterCalls++;
        return Exception is null
            ? Task.FromResult(Chapters!)
            : Task.FromException<List<MangaDexChapterDto>>(Exception);
    }
}
```

Imports:

```csharp
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Run targeted test; expected compile failure vì interface/proxy chưa tồn tại.

- [ ] **Step 3: Tạo Subject interface**

```csharp
namespace MangaNPK.Services;

public interface IMangaDexService
{
    Task<MangaDexPreviewDto> GetMangaPreviewAsync(
        string input,
        CancellationToken cancellationToken = default);

    Task<List<MangaDexChapterDto>> GetVietnameseChaptersAsync(
        string mangaId,
        CancellationToken cancellationToken = default);
}
```

- [ ] **Step 4: Cho real subject implement interface**

```csharp
public class MangaDexService(HttpClient httpClient)
    : IMangaDexService, IMangaDexChapterPageService
```

Không sửa implementation hai metadata methods.

- [ ] **Step 5: Tạo Logging proxy**

Implement đúng code trong design spec. Catch:

```csharp
catch (Exception exception)
    when (exception is not OperationCanceledException)
{
    _logger.LogError(exception, "MangaDex preview API failed.");
    throw;
}
```

Không log `input`, không validate lại và không retry.

- [ ] **Step 6: Đổi client sang Subject**

```csharp
public sealed class MangaDexImportService(
    MangaDbContext context,
    IMangaDexService mangaDexService)
```

Không đổi logic `PreviewAsync()` và `ImportAsync()`.

- [ ] **Step 7: Đăng ký Proxy**

```csharp
builder.Services.AddScoped<IMangaDexService>(provider =>
    new LoggingMangaDexProxy(
        provider.GetRequiredService<MangaDexService>(),
        provider.GetRequiredService<ILogger<LoggingMangaDexProxy>>()));
```

- [ ] **Step 8: Cập nhật architecture test**

```csharp
var parameters = typeof(MangaDexImportService)
    .GetConstructors()
    .Single()
    .GetParameters();
Assert.Contains(
    parameters,
    parameter => parameter.ParameterType == typeof(IMangaDexService));
Assert.DoesNotContain(
    parameters,
    parameter => parameter.ParameterType == typeof(MangaDexService));
```

- [ ] **Step 9: Chạy tests**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName~LoggingMangaDexProxyTests|FullyQualifiedName~MangaDexImportServiceArchitectureTests"

dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName!~SourceEncodingTests" `
  --verbosity quiet
```

Expected: PASS.

- [ ] **Step 10: Commit Proxy**

```powershell
git add -- backend/Services/MangaDex/IMangaDexService.cs backend/Services/MangaDex/LoggingMangaDexProxy.cs backend/Services/MangaDexService.cs backend/Services/MangaDexImportService.cs backend/Program.cs backend.Tests/LoggingMangaDexProxyTests.cs backend.Tests/MangaDexImportServiceArchitectureTests.cs
git commit -m "refactor: proxy MangaDex metadata requests"
```

---

### Task 4: Factory Method nền tảng và Catalog creator

**Files:**
- Create: `backend/Services/MangaCreation/MangaCreator.cs`
- Create: `backend/Services/MangaCreation/CatalogMangaCreator.cs`
- Create: `backend.Tests/MangaCreatorTests.cs`
- Modify: `backend/Services/CatalogAdminService.cs`
- Modify: `backend/Program.cs`
- Modify: `backend.Tests/CatalogAdminServiceArchitectureTests.cs`

**Interfaces:**
- Produces: `MangaCreator<TSource>.Create(TSource, DateTime)`.
- Consumes: `CreateMangaDto`.

- [ ] **Step 1: Viết failing tests cho Catalog creator**

Tạo một DTO chứa đầy đủ scalar fields, gọi creator với thời gian cố định và assert:

```csharp
[Fact]
public void CatalogCreator_PreservesExistingScalarMapping()
{
    var now = new DateTime(2026, 7, 31, 1, 2, 3, DateTimeKind.Utc);
    var dto = new CreateMangaDto
    {
        Title = "  Title  ",
        AlternativeTitle = " Alt ",
        Description = " Description ",
        CoverUrl = " https://example.test/cover.jpg ",
        Type = MangaType.Manga,
        Status = MangaStatus.Ongoing,
        Demographic = MangaDemographic.Shounen,
        Format = MangaFormat.WebComic,
        ReleaseYear = 2026,
        ContentWarnings = ["Gore"]
    };

    var manga = new CatalogMangaCreator().Create(dto, now);

    Assert.Equal("Title", manga.Title);
    Assert.Equal("Alt", manga.AlternativeTitle);
    Assert.Equal("Description", manga.Description);
    Assert.Equal("https://example.test/cover.jpg", manga.CoverUrl);
    Assert.Equal(dto.Type, manga.Type);
    Assert.Equal(dto.Status, manga.Status);
    Assert.Equal(dto.Demographic, manga.Demographic);
    Assert.Equal(dto.Format, manga.Format);
    Assert.Equal("Gore", manga.ContentWarnings);
    Assert.Equal(2026, manga.ReleaseYear);
    Assert.Equal("Local", manga.Source);
    Assert.Equal(string.Empty, manga.ExternalId);
    Assert.Equal(now, manga.CreatedAt);
    Assert.Null(manga.SyncedAt);
}
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Expected: creator types chưa tồn tại.

- [ ] **Step 3: Tạo abstract Creator**

```csharp
public abstract class MangaCreator<TSource>
{
    public Manga Create(TSource source, DateTime now)
    {
        ArgumentNullException.ThrowIfNull(source);
        return CreateManga(source, now);
    }

    protected abstract Manga CreateManga(TSource source, DateTime now);
}
```

- [ ] **Step 4: Tạo Catalog concrete creator**

```csharp
using MangaNPK.Contracts.Admin;
using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class CatalogMangaCreator
    : MangaCreator<CreateMangaDto>
{
    protected override Manga CreateManga(
        CreateMangaDto dto,
        DateTime now) => new()
    {
        Title = dto.Title.Trim(),
        AlternativeTitle = dto.AlternativeTitle?.Trim() ?? string.Empty,
        Description = dto.Description?.Trim() ?? string.Empty,
        CoverUrl = dto.CoverUrl?.Trim() ?? string.Empty,
        Type = dto.Type,
        Status = dto.Status,
        Demographic = dto.Demographic,
        Format = dto.Format,
        ContentWarnings = string.Join(
            ',',
            MangaContentWarning.Normalize(dto.ContentWarnings)),
        ReleaseYear = dto.ReleaseYear,
        CreatedAt = now
    };
}
```

Không di chuyển validation, transaction hoặc relations.

- [ ] **Step 5: Inject và sử dụng creator**

```csharp
public sealed class CatalogAdminService(
    MangaDbContext context,
    CatalogMangaCreator mangaCreator)
```

Thay:

```csharp
var manga = new Manga { ... };
```

bằng:

```csharp
var manga = _mangaCreator.Create(dto, DateTime.UtcNow);
```

- [ ] **Step 6: Đăng ký DI và cập nhật architecture test**

```csharp
builder.Services.AddScoped<CatalogMangaCreator>();
```

Architecture test assert constructor `CatalogAdminService` có `CatalogMangaCreator`.

- [ ] **Step 7: Chạy targeted và regression tests**

Expected: creator tests, catalog architecture tests và toàn bộ backend tests PASS.

- [ ] **Step 8: Commit Catalog creator**

```powershell
git add -- backend/Services/MangaCreation/MangaCreator.cs backend/Services/MangaCreation/CatalogMangaCreator.cs backend/Services/CatalogAdminService.cs backend/Program.cs backend.Tests/MangaCreatorTests.cs backend.Tests/CatalogAdminServiceArchitectureTests.cs
git commit -m "refactor: create catalog manga through factory method"
```

---

### Task 5: Factory Method cho draft và title submission

**Files:**
- Create: `backend/Services/MangaCreation/TitleDraftMangaCreator.cs`
- Create: `backend/Services/MangaCreation/TitleSubmissionMangaCreator.cs`
- Modify: `backend.Tests/MangaCreatorTests.cs`
- Modify: `backend/Services/TitleDraftAdminService.cs`
- Modify: `backend/Services/TitleSubmissionService.cs`
- Modify: `backend/Program.cs`
- Modify: `backend.Tests/TitleDraftAdminServiceArchitectureTests.cs`
- Modify: `backend.Tests/TitleDraftAdminServiceTests.cs`
- Create: `backend.Tests/TitleSubmissionServiceArchitectureTests.cs`

**Interfaces:**
- Consumes: `TitleDraft`, `TitleSubmissionPayload`.
- Produces: hai `Manga` có mapping giống code cũ.

- [ ] **Step 1: Viết failing tests cho hai creator**

`TitleDraftMangaCreator` test đầy đủ:

- Trim title/description/cover.
- Ghép original title, English title và alternative titles đúng thứ tự, loại bỏ trùng.
- Webtoon + `MangaFormat.None` trở thành `MangaFormat.WebComic`.
- Giữ content warnings, source, external ID, created/synced time.

`TitleSubmissionMangaCreator` test đầy đủ:

- Mapping scalar properties.
- `ContentWarnings` qua `MangaContentWarning.Normalize`.
- `DataSource` rỗng thành `Local`.
- MangaDex source đặt external ID và synced time.
- Alternative titles ghép giống private helper cũ.

- [ ] **Step 2: Chạy test để xác nhận RED**

Expected: hai creator chưa tồn tại.

- [ ] **Step 3: Tạo `TitleDraftMangaCreator`**

```csharp
using System.Text.Json;
using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class TitleDraftMangaCreator
    : MangaCreator<TitleDraft>
{
    protected override Manga CreateManga(
        TitleDraft draft,
        DateTime now) => new()
    {
        Title = draft.Title.Trim(),
        AlternativeTitle = BuildAlternativeTitle(draft),
        Description = draft.Description.Trim(),
        CoverUrl = draft.CoverUrl.Trim(),
        Type = draft.Type,
        Status = draft.Status,
        Demographic = draft.Demographic,
        Format = draft.Format == MangaFormat.None
            && draft.Type == MangaType.Webtoon
                ? MangaFormat.WebComic
                : draft.Format,
        ContentWarnings = draft.ContentWarnings,
        ReleaseYear = draft.ReleaseYear,
        Source = draft.DataSource,
        ExternalId = draft.DataSource == "MangaDex"
            ? draft.MangaDexId
            : string.Empty,
        CreatedAt = now,
        SyncedAt = draft.DataSource == "MangaDex" ? now : null
    };

    private static string BuildAlternativeTitle(TitleDraft draft) =>
        string.Join(
            " | ",
            new[] { draft.OriginalTitle, draft.EnglishTitle }
                .Concat(ReadStrings(draft.AlternativeTitlesJson))
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct());

    private static List<string> ReadStrings(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
```

Không di chuyển contributor, authors, genres, themes hoặc review status.

- [ ] **Step 4: Tạo `TitleSubmissionMangaCreator`**

```csharp
using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class TitleSubmissionMangaCreator
    : MangaCreator<TitleSubmissionPayload>
{
    protected override Manga CreateManga(
        TitleSubmissionPayload payload,
        DateTime now) => new()
    {
        Title = payload.Title.Trim(),
        AlternativeTitle = string.Join(
            " | ",
            new[] { payload.OriginalTitle, payload.EnglishTitle }
                .Concat(payload.AlternativeTitles)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct()),
        Description = payload.Description.Trim(),
        CoverUrl = payload.CoverUrl.Trim(),
        Type = payload.Type,
        Status = payload.Status,
        Demographic = payload.Demographic,
        Format = payload.Format,
        ContentWarnings = string.Join(
            ',',
            MangaContentWarning.Normalize(payload.ContentWarnings)),
        ReleaseYear = payload.ReleaseYear,
        Source = string.IsNullOrWhiteSpace(payload.DataSource)
            ? "Local"
            : payload.DataSource.Trim(),
        ExternalId = payload.DataSource == "MangaDex"
            ? payload.MangaDexId.Trim()
            : string.Empty,
        CreatedAt = now,
        SyncedAt = payload.DataSource == "MangaDex" ? now : null
    };
}
```

Giữ nguyên phần attach relations trong service.

- [ ] **Step 5: Inject vào hai services**

```csharp
public sealed class TitleDraftAdminService(
    MangaDbContext context,
    TitleDraftMangaCreator mangaCreator)
```

```csharp
public sealed class TitleSubmissionService(
    MangaDbContext context,
    TitleSubmissionMangaCreator mangaCreator)
```

Chỉ thay biểu thức khởi tạo entity.

- [ ] **Step 6: Đăng ký DI**

```csharp
builder.Services.AddScoped<TitleDraftMangaCreator>();
builder.Services.AddScoped<TitleSubmissionMangaCreator>();
```

- [ ] **Step 7: Cập nhật architecture tests**

Assert hai service phụ thuộc creator tương ứng. Giữ nguyên assertions controller → application service.

- [ ] **Step 8: Cập nhật các test khởi tạo service trực tiếp**

Trong `TitleDraftAdminServiceTests.cs`, thay:

```csharp
new TitleDraftAdminService(context)
```

bằng:

```csharp
new TitleDraftAdminService(context, new TitleDraftMangaCreator())
```

Không đổi assertions của test từ chối draft.

- [ ] **Step 9: Chạy tests**

Run creator, title draft, title submission architecture tests, sau đó toàn bộ backend suite.

Expected: PASS; không có thay đổi review transitions.

- [ ] **Step 10: Commit**

```powershell
git add -- backend/Services/MangaCreation/TitleDraftMangaCreator.cs backend/Services/MangaCreation/TitleSubmissionMangaCreator.cs backend/Services/TitleDraftAdminService.cs backend/Services/TitleSubmissionService.cs backend/Program.cs backend.Tests/MangaCreatorTests.cs backend.Tests/TitleDraftAdminServiceArchitectureTests.cs backend.Tests/TitleDraftAdminServiceTests.cs backend.Tests/TitleSubmissionServiceArchitectureTests.cs
git commit -m "refactor: create approved and submitted manga through factories"
```

---

### Task 6: Factory Method cho MangaDex import

**Files:**
- Create: `backend/Services/MangaCreation/MangaDexMangaCreator.cs`
- Modify: `backend.Tests/MangaCreatorTests.cs`
- Modify: `backend/Services/MangaDexImportService.cs`
- Modify: `backend/Program.cs`
- Modify: `backend.Tests/MangaDexImportServiceArchitectureTests.cs`

**Interfaces:**
- Consumes: `MangaDexPreviewDto`.
- Produces: MangaDex `Manga` mới.

- [ ] **Step 1: Viết failing creator test**

Assert tất cả scalar fields:

```csharp
Assert.Equal(preview.Title, manga.Title);
Assert.Equal(preview.AlternativeTitle, manga.AlternativeTitle);
Assert.Equal(preview.Description, manga.Description);
Assert.Equal(preview.CoverUrl, manga.CoverUrl);
Assert.Equal(preview.Type, manga.Type);
Assert.Equal(preview.Status, manga.Status);
Assert.Equal(preview.Demographic, manga.Demographic);
Assert.Equal(preview.Format, manga.Format);
Assert.Equal(preview.ReleaseYear, manga.ReleaseYear);
Assert.Equal("MangaDex", manga.Source);
Assert.Equal(preview.Id, manga.ExternalId);
Assert.Equal(now, manga.CreatedAt);
Assert.Equal(now, manga.SyncedAt);
```

Content warning test phải lấy riêng các tag có `Group == "content"` và normalize giống code cũ.

- [ ] **Step 2: Chạy RED**

Expected: `MangaDexMangaCreator` chưa tồn tại.

- [ ] **Step 3: Tạo concrete creator**

```csharp
using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class MangaDexMangaCreator
    : MangaCreator<MangaDexPreviewDto>
{
    protected override Manga CreateManga(
        MangaDexPreviewDto preview,
        DateTime now) => new()
    {
        Title = preview.Title,
        AlternativeTitle = preview.AlternativeTitle,
        Description = preview.Description,
        CoverUrl = preview.CoverUrl,
        Type = preview.Type,
        Status = preview.Status,
        Demographic = preview.Demographic,
        Format = preview.Format,
        ContentWarnings = string.Join(
            ',',
            MangaContentWarning.Normalize(
                preview.Tags
                    .Where(tag => string.Equals(
                        tag.Group,
                        "content",
                        StringComparison.OrdinalIgnoreCase))
                    .Select(tag => tag.Name))),
        ReleaseYear = preview.ReleaseYear,
        Source = "MangaDex",
        ExternalId = preview.Id,
        CreatedAt = now,
        SyncedAt = now
    };
}
```

Không sửa nhánh cập nhật manga đã tồn tại.

- [ ] **Step 4: Inject và dùng trong nhánh `manga == null`**

```csharp
if (manga == null)
{
    manga = _mangaCreator.Create(preview, now);
    _context.Mangas.Add(manga);
}
```

Giữ phần assignment hiện tại ngay sau block trong lần refactor đầu để cả create và update có cùng kết quả như trước.

- [ ] **Step 5: Đăng ký DI và architecture test**

```csharp
builder.Services.AddScoped<MangaDexMangaCreator>();
```

Assert `MangaDexImportService` phụ thuộc cả `IMangaDexService` và `MangaDexMangaCreator`.

- [ ] **Step 6: Chạy tests**

Run creator tests, MangaDex architecture tests và toàn bộ backend suite.

- [ ] **Step 7: Commit**

```powershell
git add -- backend/Services/MangaCreation/MangaDexMangaCreator.cs backend/Services/MangaDexImportService.cs backend/Program.cs backend.Tests/MangaCreatorTests.cs backend.Tests/MangaDexImportServiceArchitectureTests.cs
git commit -m "refactor: create imported manga through factory method"
```

---

### Task 7: Command cho report moderation

**Files:**
- Create: `backend/Services/Reports/UpdateReportStatusCommand.cs`
- Create: `backend/Services/Reports/IReportCommandHandler.cs`
- Create: `backend/Services/Reports/UpdateReportStatusCommandHandler.cs`
- Create: `backend.Tests/UpdateReportStatusCommandHandlerTests.cs`
- Create: `backend.Tests/ReportCommandArchitectureTests.cs`
- Modify: `backend/Controllers/ReportsController.cs`
- Modify: `backend/Program.cs`

**Interfaces:**
- Produces:

```csharp
Task<ReportCommandResult> IReportCommandHandler.ExecuteAsync(
    UpdateReportStatusCommand command,
    CancellationToken cancellationToken = default);
```

- Preserves: `PATCH /api/reports/{id:int}` and `UpdateReportDto`.

- [ ] **Step 1: Viết failing handler tests**

Tạo InMemory `MangaDbContext` và `FixedTimeProvider`:

```csharp
private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}
```

Test cases:

1. `Status = null` → BadRequest, không sửa DB.
2. `Status = "Pending"` → BadRequest.
3. Report ID không tồn tại → NotFound.
4. `"Resolved"` → persisted `Resolved`, fixed `ResolvedAt`, admin user ID và trimmed note.
5. `"Dismissed"` → persisted `Dismissed`.
6. Whitespace admin note → `null`.

- [ ] **Step 2: Chạy RED**

Expected: command/handler chưa tồn tại.

- [ ] **Step 3: Tạo command, result và handler interface**

```csharp
using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed record UpdateReportStatusCommand(
    int ReportId,
    string? Status,
    string? AdminNote,
    int? ResolvedByUserId);

public enum ReportCommandStatus
{
    Success,
    NotFound,
    BadRequest
}

public sealed record ReportCommandResult(
    ReportCommandStatus Status,
    string Message = "",
    int? ReportId = null,
    ReportStatus? ReportStatus = null);
```

```csharp
namespace MangaNPK.Services;

public interface IReportCommandHandler
{
    Task<ReportCommandResult> ExecuteAsync(
        UpdateReportStatusCommand command,
        CancellationToken cancellationToken = default);
}
```

- [ ] **Step 4: Tạo concrete handler**

```csharp
using MangaNPK.Data;
using MangaNPK.Models;

namespace MangaNPK.Services;

public sealed class UpdateReportStatusCommandHandler(
    MangaDbContext context,
    TimeProvider timeProvider) : IReportCommandHandler
{
    public async Task<ReportCommandResult> ExecuteAsync(
        UpdateReportStatusCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<ReportStatus>(
                command.Status,
                true,
                out var status)
            || status == ReportStatus.Pending)
        {
            return new(
                ReportCommandStatus.BadRequest,
                "Trạng thái xử lý không hợp lệ.");
        }

        var report = await context.Reports.FindAsync(
            [command.ReportId],
            cancellationToken);
        if (report is null)
        {
            return new(
                ReportCommandStatus.NotFound,
                "Không tìm thấy báo cáo.");
        }

        report.Status = status;
        report.ResolvedAt = timeProvider.GetUtcNow().UtcDateTime;
        report.ResolvedByUserId = command.ResolvedByUserId;
        report.AdminNote = string.IsNullOrWhiteSpace(command.AdminNote)
            ? null
            : command.AdminNote.Trim();

        await context.SaveChangesAsync(cancellationToken);

        return new(
            ReportCommandStatus.Success,
            ReportId: report.Id,
            ReportStatus: report.Status);
    }
}
```

- [ ] **Step 5: Viết architecture test**

```csharp
[Fact]
public void ReportsController_DelegatesModerationToCommandHandler()
{
    var parameters = typeof(ReportsController)
        .GetConstructors()
        .Single()
        .GetParameters();

    Assert.Contains(
        parameters,
        parameter => parameter.ParameterType == typeof(IReportCommandHandler));
}
```

Test route và `[RequireAdmin]` tiếp tục được bảo vệ bởi compatibility contract.

- [ ] **Step 6: Refactor controller**

Constructor:

```csharp
public class ReportsController(
    MangaDbContext context,
    IReportCommandHandler reportCommandHandler) : ControllerBase
```

`Create`, `List`, `MyReports` vẫn dùng `_context` như trước. Chỉ `UpdateStatus` tạo command, gọi handler và map result thành cùng status code/JSON.

- [ ] **Step 7: Đăng ký DI**

```csharp
builder.Services.AddScoped<
    IReportCommandHandler,
    UpdateReportStatusCommandHandler>();
```

`TimeProvider.System` đã được đăng ký Singleton.

- [ ] **Step 8: Chạy targeted tests**

Run:

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName~UpdateReportStatusCommandHandlerTests|FullyQualifiedName~ReportCommandArchitectureTests|FullyQualifiedName~DesignPatternCompatibilityContractTests"

node --test backend.Tests\js\report-api-contract.test.cjs backend.Tests\js\admin-report-pagination.test.cjs
```

Expected: PASS.

- [ ] **Step 9: Chạy backend regression suite**

Expected: PASS.

- [ ] **Step 10: Commit Command**

```powershell
git add -- backend/Services/Reports/UpdateReportStatusCommand.cs backend/Services/Reports/IReportCommandHandler.cs backend/Services/Reports/UpdateReportStatusCommandHandler.cs backend/Controllers/ReportsController.cs backend/Program.cs backend.Tests/UpdateReportStatusCommandHandlerTests.cs backend.Tests/ReportCommandArchitectureTests.cs
git commit -m "refactor: handle report moderation as commands"
```

---

### Task 8: DI smoke test và tài liệu 10/20 patterns

**Files:**
- Create: `backend.Tests/DesignPatternDependencyInjectionTests.cs`
- Modify: `docs/design-patterns.md`
- Verify: `docs/superpowers/specs/2026-07-31-ten-design-patterns-design.md`

**Interfaces:**
- Consumes: toàn bộ services mới.
- Produces: bằng chứng DI graph hợp lệ và tài liệu 10/20.

- [ ] **Step 1: Viết DI smoke test**

```csharp
using MangaNPK.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MangaNPK.Tests;

public sealed class DesignPatternDependencyInjectionTests
{
    [Fact]
    public void ServiceGraph_ResolvesAllPatternComponents()
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
                builder.UseEnvironment("Testing"));
        using var scope = factory.Services.CreateScope();
        var provider = scope.ServiceProvider;

        Assert.IsType<CachedMangaDexChapterPageService>(
            provider.GetRequiredService<IMangaDexChapterPageService>());
        Assert.IsType<LoggingMangaDexProxy>(
            provider.GetRequiredService<IMangaDexService>());
        Assert.IsType<UpdateReportStatusCommandHandler>(
            provider.GetRequiredService<IReportCommandHandler>());
        Assert.NotNull(provider.GetRequiredService<CatalogMangaCreator>());
        Assert.NotNull(provider.GetRequiredService<TitleDraftMangaCreator>());
        Assert.NotNull(provider.GetRequiredService<TitleSubmissionMangaCreator>());
        Assert.NotNull(provider.GetRequiredService<MangaDexMangaCreator>());
    }
}
```

- [ ] **Step 2: Chạy DI test**

Expected: PASS và không circular dependency.

- [ ] **Step 3: Cập nhật `docs/design-patterns.md`**

Đổi tổng từ 6/20 thành 10/20 và thêm bốn phần:

- Factory Method: bốn concrete creators và bốn production clients.
- Decorator: chapter page cache.
- Proxy: MangaDex metadata logging proxy.
- Command: report moderation command/handler.

Cập nhật:

- Bảng tổng hợp.
- Mermaid diagrams.
- Danh sách source.
- Danh sách “chưa có” từ 14 xuống 10.
- Xóa Factory Method, Decorator, Proxy và Command khỏi danh sách chưa có.

Không sửa lại lịch sử thành “mẫu đã tồn tại từ trước”; ghi rõ đây là cấu trúc hiện tại sau refactor.

- [ ] **Step 4: Kiểm tra tài liệu**

Run:

```powershell
$text = Get-Content -Raw docs\design-patterns.md
if ($text -notmatch '10/20') { throw 'Missing 10/20 total.' }
if ($text -match 'Factory Method \\| Chưa có|Decorator \\| Chưa xác nhận|Proxy \\| Chưa có|Command \\| Chưa có') {
    throw 'Stale pattern classification remains.'
}
git diff --check -- docs/design-patterns.md
```

Expected: PASS.

- [ ] **Step 5: Commit DI test và docs**

```powershell
git add -- backend.Tests/DesignPatternDependencyInjectionTests.cs docs/design-patterns.md docs/superpowers/specs/2026-07-31-ten-design-patterns-design.md docs/superpowers/plans/2026-07-31-ten-design-patterns-implementation.md
git commit -m "docs: document ten design patterns"
```

---

### Task 9: Verification cuối và manual smoke test

**Files:**
- Verify only.

**Interfaces:**
- Consumes: toàn bộ thay đổi Tasks 1–8.
- Produces: bằng chứng không regression.

- [ ] **Step 1: Chạy toàn bộ backend tests**

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName!~SourceEncodingTests" `
  --verbosity quiet
```

Expected: tất cả tests đạt, 0 failed.

- [ ] **Step 2: Chạy toàn bộ JavaScript tests**

```powershell
node --test backend.Tests\js
```

Expected: tất cả tests đạt, 0 failed.

- [ ] **Step 3: Build Release**

```powershell
dotnet build backend\MangaNPK.csproj `
  --configuration Release `
  --no-restore `
  --verbosity quiet
```

Expected: 0 errors. Không chấp nhận warning mới do thay đổi này.

- [ ] **Step 4: Kiểm tra diff**

```powershell
git diff --check
git status --short
git diff --name-only HEAD~5..HEAD
```

Expected:

- Không whitespace error.
- Không có migration mới.
- Không có thay đổi `Views/` hoặc `wwwroot/`.
- `appthoitrang_ascii/` vẫn untracked và không được stage.

- [ ] **Step 5: Manual smoke test**

Chạy một instance duy nhất của web. Nếu cổng 5274 đang được sử dụng, dừng đúng tiến trình MangaNPK cũ trước khi chạy, không khởi động instance thứ hai.

Kiểm tra:

1. Trang chủ và chi tiết truyện mở bình thường.
2. Chapter MangaDex tải ảnh; lần tải thứ hai không đổi kết quả.
3. Admin preview/import MangaDex.
4. Admin tạo manga local.
5. Admin duyệt title draft thành manga.
6. Admin chuyển report sang Resolved.
7. Admin chuyển report khác sang Dismissed.
8. “Báo cáo của tôi” hiển thị trạng thái mới.

- [ ] **Step 6: Ghi nhận kết quả**

Chỉ tuyên bố hoàn thành khi:

- Automated tests đạt.
- Build đạt.
- Smoke test đạt.
- Diff đúng phạm vi.
