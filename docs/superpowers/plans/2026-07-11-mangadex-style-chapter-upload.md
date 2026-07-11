# MangaDex-style Chapter Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép quản trị viên kéo-thả, xem trước, sắp xếp và upload nhiều ảnh để tạo chapter trong một request duy nhất.

**Architecture:** Form MVC hiện tại chuyển sang multipart và giữ danh sách file đã sắp xếp ở trình duyệt. Controller xác thực toàn bộ input trước, lưu chapter/pages trong transaction và lưu ảnh vào thư mục riêng; nếu lỗi thì rollback dữ liệu và xóa thư mục vừa tạo.

**Tech Stack:** ASP.NET Core MVC, Entity Framework Core/SQL Server, Razor, Bootstrap, JavaScript thuần.

## Global Constraints

- Chỉ quản trị viên được truy cập; giữ anti-forgery token.
- Chỉ JPG/JPEG, PNG, WebP, GIF; tối đa 15 MB/file, 500 file và 500 MB/request.
- Giữ URL ảnh cũ làm phương án phụ; chapter phải có ít nhất một trang.
- Giao diện phải dùng lại style Bootstrap và cấu trúc layout hiện tại.
- Không chỉnh sửa các thay đổi không liên quan đang có trong working tree.

---

### Task 1: Xác thực ảnh upload dùng chung

**Files:**
- Create: `backend/Services/ChapterImageValidator.cs`
- Create: `backend.Tests/ChapterImageValidatorTests.cs`
- Create: `backend.Tests/MangaNPK.Tests.csproj`

**Interfaces:**
- Produces: `ChapterImageValidator.ValidateAsync(IReadOnlyList<IFormFile>, CancellationToken) -> Task<string?>`; trả về `null` khi hợp lệ, ngược lại là thông báo lỗi tiếng Việt.
- Produces: `ChapterImageValidator.GetSafeExtension(string) -> string` để controller tạo tên file an toàn.

- [ ] **Step 1: Tạo test project và test thất bại**

Tạo project xUnit tham chiếu `../backend/MangaNPK.csproj`. Test một PNG hợp lệ, file giả mạo đuôi PNG, file vượt 15 MB, danh sách vượt 500 file và ánh xạ `.jpeg` thành `.jpg`.

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore`
Expected: FAIL vì `ChapterImageValidator` chưa tồn tại.

- [ ] **Step 3: Viết implementation tối thiểu**

`ChapterImageValidator` khai báo `MaxFileCount = 500`, `MaxFileSize = 15 * 1024 * 1024`, kiểm tra phần mở rộng và magic bytes. WebP phải đồng thời có `RIFF` tại byte 0 và `WEBP` tại byte 8; mọi stream được dispose sau khi đọc tối đa 12 byte.

- [ ] **Step 4: Chạy test**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj`
Expected: PASS toàn bộ test validator.

- [ ] **Step 5: Commit**

```bash
git add backend/Services/ChapterImageValidator.cs backend.Tests
git commit -m "test: add chapter image validation"
```

### Task 2: Lưu chapter và ảnh theo kiểu atomic

**Files:**
- Modify: `backend/Controllers/AdminViewController.cs`
- Modify: `backend/Program.cs`
- Create: `backend.Tests/AdminChapterUploadTests.cs`

**Interfaces:**
- Consumes: `ChapterImageValidator.ValidateAsync` và `GetSafeExtension` từ Task 1.
- Produces: POST `/admin/chapter/create/{mangaId}` nhận `IReadOnlyList<IFormFile>? pageFiles` cùng các field cũ.

- [ ] **Step 1: Viết integration test thất bại**

Test các hành vi: từ chối chapter không trang; từ chối số chapter local trùng; tạo `PageNumber` theo thứ tự multipart; URL hợp lệ được nối sau file; URL không hợp lệ trả lại form; lỗi lưu file không để lại chapter/page.

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter AdminChapterUploadTests`
Expected: FAIL vì action chưa nhận `pageFiles` và chưa xác thực.

- [ ] **Step 3: Đăng ký validator và cập nhật action**

Đăng ký `builder.Services.AddSingleton<ChapterImageValidator>();`. Inject `IWebHostEnvironment` và validator vào `AdminViewController`. Đặt `[RequestSizeLimit(500 * 1024 * 1024)]` cho POST action. Action chuẩn hóa URL, kiểm tra chapter trùng bằng `MangaId`, `ChapterNumber`, `Source == "Local"`, rồi bắt đầu transaction.

Thư mục đích là `Path.Combine(WebRootPath, "uploads", "manga", mangaId.ToString(), "chapters", chapter.Id.ToString())`. Tên file là `$"{pageNumber:0000}{extension}"`; URL lưu DB dùng dấu `/`: `$"/uploads/manga/{mangaId}/chapters/{chapter.Id}/{fileName}"`.

Toàn bộ file được xác thực trước transaction. Trong `catch`, rollback, xóa đúng `chapterDirectory` nếu tồn tại, ghi log và trả lại view với `ViewBag.Error`. Chỉ commit sau khi lưu toàn bộ `Page` thành công.

- [ ] **Step 4: Chạy integration test và build**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --filter AdminChapterUploadTests`
Expected: PASS.

Run: `dotnet build backend/MangaNPK.csproj --no-restore`
Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add backend/Controllers/AdminViewController.cs backend/Program.cs backend.Tests/AdminChapterUploadTests.cs
git commit -m "feat: save uploaded chapter pages atomically"
```

### Task 3: Giao diện kéo-thả đồng bộ trang quản trị

**Files:**
- Modify: `backend/Views/AdminView/ChapterCreate.cshtml`
- Create: `backend/wwwroot/js/chapter-upload.js`
- Modify: `backend/wwwroot/css/style.css`

**Interfaces:**
- Consumes: input multipart `pageFiles` của Task 2.
- Produces: danh sách `File` theo đúng thứ tự giao diện và đồng bộ lại input qua `DataTransfer`.

- [ ] **Step 1: Thêm markup form multipart**

Thêm `enctype="multipart/form-data"`, vùng drop có input `multiple accept="image/jpeg,image/png,image/webp,image/gif"`, dòng trạng thái, danh sách preview và template thumbnail. Hiển thị `ViewBag.Error` bằng alert Bootstrap. Giữ textarea `pageUrls` trong phần tùy chọn thu gọn.

- [ ] **Step 2: Viết hành vi JavaScript**

Script duy trì `selectedFiles`, sắp tên bằng `localeCompare` với `{ numeric: true, sensitivity: 'base' }`, tạo preview bằng `URL.createObjectURL`, thu hồi object URL khi render lại, hỗ trợ drag/drop file vào vùng chọn, kéo item để đổi vị trí, xóa từng item và cập nhật số trang. Trước submit, từ chối khi cả file và URL đều trống; khóa nút submit và đổi nhãn sang `Đang tải chapter...`.

- [ ] **Step 3: Đồng bộ style hiện tại**

Thêm class riêng cho drop zone, trạng thái hover, lưới thumbnail, số trang và nút xóa. Dùng biến màu, border-radius, card và breakpoint đang có; không thay style toàn cục của trang khác.

- [ ] **Step 4: Kiểm tra build và smoke test thủ công**

Run: `dotnet build backend/MangaNPK.csproj --no-restore`
Expected: Build succeeded, 0 errors.

Smoke test: chọn `1.jpg`, `10.jpg`, `2.jpg` phải hiện 1-2-10; kéo 10 lên đầu phải gửi 10-1-2; xóa ảnh cập nhật số trang; drop file không phải ảnh bị bỏ qua với thông báo; submit thành công chuyển về chi tiết truyện và reader hiển thị đúng thứ tự.

- [ ] **Step 5: Commit**

```bash
git add backend/Views/AdminView/ChapterCreate.cshtml backend/wwwroot/js/chapter-upload.js backend/wwwroot/css/style.css
git commit -m "feat: add MangaDex-style chapter upload UI"
```

### Task 4: Xác minh hoàn chỉnh

**Files:**
- Verify only; không tạo file mới.

**Interfaces:**
- Consumes: toàn bộ feature từ Task 1-3.
- Produces: bằng chứng test/build và danh sách file thay đổi đúng phạm vi.

- [ ] **Step 1: Chạy toàn bộ test**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj`
Expected: PASS, 0 failed.

- [ ] **Step 2: Build bản Release**

Run: `dotnet build backend/MangaNPK.csproj -c Release --no-restore`
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Kiểm tra diff phạm vi**

Run: `git diff --check`
Expected: không có lỗi whitespace.

Run: `git status --short`
Expected: chỉ các file feature hoặc thay đổi có sẵn của người dùng; không có file build `bin/`, `obj/` mới được track.
