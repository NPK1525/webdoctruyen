# 10 Design Patterns áp dụng trong đồ án MangaNPK

Tài liệu này dùng để mở mã nguồn khi quay video demo. Mỗi mẫu chỉ gồm:

- vị trí file;
- một đoạn code tiêu biểu;
- cách hoạt động trong đồ án.

---

## 1. Singleton Pattern

**File:** `backend/Program.cs`
**Dòng:** 77, 96–99

```csharp
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
```

**Cách hoạt động:**

Singleton Pattern bảo đảm một class chỉ có một instance dùng chung trong toàn bộ ứng dụng.

Trong dự án này không viết Singleton theo kiểu thủ công:

```csharp
public sealed class Singleton
{
    private static readonly Singleton _instance = new Singleton();
    private Singleton() { }
    public static Singleton Instance => _instance;
}
```

Thay vào đó, dự án dùng Singleton thông qua **ASP.NET Core Dependency Injection**. Khi đăng ký service bằng `AddSingleton`, DI container sẽ tự tạo và giữ một instance duy nhất. Những class cần dùng service đó sẽ nhận instance thông qua constructor injection, không cần gọi `Singleton.Instance`.

Ví dụ `TimeProvider.System` được đăng ký singleton để toàn bộ ứng dụng dùng chung nguồn thời gian. Các store của rate limit cũng dùng singleton vì chúng cần lưu trạng thái giới hạn request chung cho toàn app.

Nói ngắn gọn: đây là Singleton do framework quản lý, không phải Singleton tự viết bằng biến `static`.

---

## 2. Builder Pattern

**File:** `backend/Program.cs`
**Dòng:** 11, 105

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<MangaDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllersWithViews();
builder.Services.AddSession();

var app = builder.Build();
```

**Cách hoạt động:**

Builder Pattern dùng để xây dựng một đối tượng phức tạp qua nhiều bước cấu hình.

Trong dự án, đối tượng cần tạo là `WebApplication`. Thay vì tạo app trực tiếp bằng một constructor lớn, ASP.NET Core cung cấp `WebApplicationBuilder`.

Quy trình hoạt động:

1. `WebApplication.CreateBuilder(args)` tạo builder ban đầu.
2. Các dòng `builder.Services...` thêm database, controller, session, service nghiệp vụ.
3. Các dòng cấu hình khác thêm logging, rate limit, email, authentication.
4. Sau khi cấu hình xong, `builder.Build()` tạo ra `WebApplication` hoàn chỉnh.

Đây là Builder Pattern vì quá trình tạo app được tách thành nhiều bước cấu hình rõ ràng trước khi tạo sản phẩm cuối cùng.

---

## 3. Factory Method Pattern

**File:** `backend/Services/MangaCreation/MangaCreator.cs`
**Dòng:** 5–13

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

**Cách hoạt động:**

Factory Method Pattern cho phép lớp cha định nghĩa quy trình tạo object, còn lớp con quyết định cách tạo object cụ thể.

Trong dự án, object cần tạo là `Manga`. Dữ liệu tạo Manga có thể đến từ nhiều nguồn:

- admin tạo truyện trong trang quản trị;
- import truyện từ MangaDex;
- duyệt bản nháp truyện;
- user gửi bản nháp truyện.

`MangaCreator<TSource>` là lớp cha. Method `Create()` là quy trình tạo chung. Bên trong nó gọi `CreateManga()`, đây là factory method. Các lớp con như `CatalogMangaCreator` hoặc `MangaDexMangaCreator` override `CreateManga()` để tạo Manga theo dữ liệu đầu vào riêng.

Nhờ vậy, service chỉ cần gọi:

```csharp
var manga = _mangaCreator.Create(dto, DateTime.UtcNow);
```

Service không cần biết chi tiết Manga được tạo từ admin form hay MangaDex API.

---

## 4. Adapter Pattern

**File:** `backend/Services/Email/SmtpEmailSender.cs`
**Dòng:** 7

```csharp
public sealed class SmtpEmailSender(IOptions<SmtpOptions> options) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        using var mail = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = message.Subject,
            Body = message.HtmlBody,
            IsBodyHtml = true
        };

        mail.To.Add(new MailAddress(message.To));

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(_options.Username, _options.Password)
        };

        await client.SendMailAsync(mail, cancellationToken);
    }
}
```

**Cách hoạt động:**

Adapter Pattern dùng để chuyển một interface hoặc kiểu dữ liệu không tương thích thành dạng mà hệ thống mong muốn.

Trong dự án, service nghiệp vụ chỉ muốn gửi email thông qua object nội bộ `EmailMessage`. Nhưng thư viện .NET gửi mail lại dùng `MailMessage`, `SmtpClient` và `NetworkCredential`.

`SmtpEmailSender` đóng vai trò Adapter:

1. nhận `EmailMessage` từ hệ thống;
2. chuyển subject, body, người nhận sang `MailMessage`;
3. cấu hình `SmtpClient`;
4. gọi `SendMailAsync` để gửi email thật.

Nhờ Adapter, các service như quên mật khẩu không cần biết chi tiết `SmtpClient` hoạt động thế nào.

---

## 5. Facade Pattern

**File:** `backend/Services/CatalogAdminService.cs`
**Dòng:** 47–63

```csharp
public async Task<CatalogOperationResult> CreateMangaAsync(CreateMangaDto dto, CancellationToken cancellationToken = default)
{
    var manga = _mangaCreator.Create(dto, DateTime.UtcNow);
    _context.Mangas.Add(manga);
    await _context.SaveChangesAsync(cancellationToken);

    AddRelations(manga.Id, dto);
    await _context.SaveChangesAsync(cancellationToken);

    return new(CatalogOperationStatus.Success, "Manga created successfully", manga.Id);
}
```

**Cách hoạt động:**

Facade Pattern cung cấp một interface đơn giản để che giấu một quy trình phức tạp phía sau.

Trong dự án, khi admin tạo truyện, hệ thống không chỉ thêm một dòng Manga. Nó còn phải:

1. kiểm tra dữ liệu đầu vào;
2. tạo object `Manga`;
3. lưu vào database;
4. thêm quan hệ tác giả;
5. thêm quan hệ thể loại;
6. thêm quan hệ theme;
7. xử lý transaction;
8. trả kết quả cho controller.

Nếu controller tự làm hết, controller sẽ rất dài và khó bảo trì. Vì vậy controller chỉ gọi `CreateMangaAsync()`. Toàn bộ quy trình phức tạp được gom trong `CatalogAdminService`.

Đây là Facade Pattern vì `CatalogAdminService` cung cấp một cổng đơn giản cho controller, còn chi tiết xử lý nằm bên trong service.

---

## 6. Proxy Pattern

**File:** `backend/Services/MangaDex/LoggingMangaDexProxy.cs`
**Dòng:** 3–7

```csharp
public sealed class LoggingMangaDexProxy(
    IMangaDexService inner,
    ILogger<LoggingMangaDexProxy> logger) : IMangaDexService
{
    public async Task<MangaDexPreviewDto> GetMangaPreviewAsync(
        string input,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Calling MangaDex preview API.");
        var result = await _inner.GetMangaPreviewAsync(input, cancellationToken);
        _logger.LogInformation("MangaDex preview API succeeded.");
        return result;
    }
}
```

**Cách hoạt động:**

Proxy Pattern dùng một object đại diện để kiểm soát việc truy cập đến object thật.

Trong dự án:

- `MangaDexService` là service thật gọi API MangaDex;
- `LoggingMangaDexProxy` là proxy;
- cả hai cùng dùng contract `IMangaDexService`.

Khi hệ thống gọi MangaDex, request không đi thẳng đến service thật mà đi qua proxy. Proxy ghi log trước khi gọi, chuyển request cho `_inner`, nhận kết quả, ghi log thành công rồi trả kết quả ra ngoài.

Proxy không thay đổi dữ liệu. Nó chỉ kiểm soát lời gọi để thêm logging và xử lý lỗi quan sát được. Nhờ vậy code import MangaDex không cần tự ghi log ở mọi nơi.

---

## 7. Decorator Pattern

**File:** `backend/Services/MangaDex/CachedMangaDexChapterPageService.cs`
**Dòng:** 5–10

```csharp
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
```

**Cách hoạt động:**

Decorator Pattern dùng để thêm hành vi mới cho object mà không sửa code object gốc.

Trong dự án, service gốc có nhiệm vụ lấy danh sách URL ảnh chương từ MangaDex. Việc lấy dữ liệu này có thể tốn thời gian nếu gọi API ngoài nhiều lần. Vì vậy `CachedMangaDexChapterPageService` bọc service gốc để thêm cache.

Quy trình hoạt động:

1. tạo `cacheKey` theo chapter id và chế độ data saver;
2. nếu cache có dữ liệu thì trả về ngay;
3. nếu chưa có cache thì gọi `_inner.GetChapterPageUrlsAsync(...)`;
4. lưu kết quả vào cache trong 5 phút;
5. trả danh sách URL ảnh.

Đây là Decorator vì nó giữ nguyên interface `IMangaDexChapterPageService`, nhưng bổ sung thêm chức năng cache cho service gốc.

---

## 8. Strategy Pattern

**File:** `backend/Services/Email/IEmailSender.cs` và `backend/Services/PasswordResetService.cs`
**Dòng:** `IEmailSender.cs` dòng 3, `PasswordResetService.cs` dòng 18–20

```csharp
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

public sealed class PasswordResetService(
    MangaDbContext context,
    IEmailSender emailSender,
    TimeProvider timeProvider)
{
}
```

**Cách hoạt động:**

Strategy Pattern đóng gói các thuật toán hoặc hành vi có thể thay thế cho nhau sau một interface chung.

Trong dự án, hành vi cần thay thế là **cách gửi email**.

`PasswordResetService` chỉ biết đến interface `IEmailSender`. Nó không biết email được gửi bằng SMTP, Gmail API hay SendGrid. Hiện tại dự án dùng concrete strategy là `SmtpEmailSender`, được đăng ký trong `Program.cs`.

Nếu sau này muốn đổi cách gửi email, chỉ cần tạo class mới:

```csharp
public sealed class SendGridEmailSender : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        // gửi bằng SendGrid
    }
}
```

Sau đó đổi DI registration. Logic quên mật khẩu không cần sửa. Đây là Strategy Pattern vì thuật toán gửi email được tách ra và có thể thay thế.

---

## 9. Command Pattern

**File:** `backend/Services/Reports/UpdateReportStatusCommand.cs` và `backend/Controllers/ReportsController.cs`
**Dòng:** `UpdateReportStatusCommand.cs` dòng 5, `ReportsController.cs` dòng 180–185

```csharp
public sealed record UpdateReportStatusCommand(
    int ReportId,
    string? Status,
    string? AdminNote,
    int? ResolvedByUserId);

var command = new UpdateReportStatusCommand(
    id,
    dto.Status,
    dto.AdminNote,
    userId);

var result = await _reportCommandHandler.ExecuteAsync(
    command,
    HttpContext.RequestAborted);
```

**Cách hoạt động:**

Command Pattern đóng gói một yêu cầu hoặc hành động thành object riêng.

Trong dự án, hành động được đóng gói là **admin cập nhật trạng thái báo cáo**.

Thay vì controller tự cập nhật report trực tiếp, controller tạo `UpdateReportStatusCommand`. Command này chứa:

- `ReportId`: báo cáo cần xử lý;
- `Status`: trạng thái mới;
- `AdminNote`: ghi chú của admin;
- `ResolvedByUserId`: admin xử lý.

Sau đó command được gửi cho `_reportCommandHandler.ExecuteAsync(...)`. Handler sẽ kiểm tra trạng thái, tìm report, cập nhật database và trả kết quả.

Đây là Command Pattern vì hành động cập nhật báo cáo được biến thành một object có thể truyền đi và xử lý bởi handler riêng.

---

## 10. Chain of Responsibility Pattern

**File:** `backend/Program.cs`
**Dòng:** 144–154

```csharp
app.UseStaticFiles();
app.UseSession();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapControllers();
```

**Cách hoạt động:**

Chain of Responsibility Pattern cho phép một request đi qua nhiều bộ xử lý theo thứ tự. Mỗi bộ xử lý có thể xử lý request hoặc chuyển tiếp cho bộ xử lý tiếp theo.

Trong ASP.NET Core, chuỗi này chính là middleware pipeline.

Quy trình hoạt động:

1. request đi vào ứng dụng;
2. `UseStaticFiles()` kiểm tra request có phải file tĩnh không;
3. `UseSession()` xử lý session;
4. `UseAuthorization()` kiểm tra quyền truy cập;
5. routing chuyển request đến controller phù hợp;
6. `MapControllers()` ánh xạ request đến API controller.

Mỗi middleware chỉ chịu một trách nhiệm riêng. Đây là Chain of Responsibility vì request được truyền qua một chuỗi xử lý thay vì gom tất cả logic vào một chỗ.
