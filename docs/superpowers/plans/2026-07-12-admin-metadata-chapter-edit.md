# Admin Metadata and Chapter Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện admin để sửa đủ metadata truyện, nhập đúng taxonomy MangaDex, sửa chapter/ảnh lỗi và loại bỏ lỗi encoding reader.

**Architecture:** Giữ trang admin và các API hiện tại, bổ sung Theme vào luồng manga và thêm API đọc/cập nhật chapter. Logic mapping/validation được tách thành hàm kiểm thử được; JavaScript admin chuyển form chapter giữa create/edit và chỉ gửi danh sách trang cuối cùng.

**Tech Stack:** ASP.NET Core MVC/API, Entity Framework Core/SQL Server, Razor, JavaScript thuần, xUnit, Node test runner.

## Global Constraints

- Giữ một `MangaFormat` chính cho mỗi truyện.
- Không cho chuyển chapter sang truyện khác.
- Chapter MangaDex không cho sửa pages.
- Chuỗi mới dùng UTF-8 chuẩn, Unicode escape trong JavaScript hoặc HTML entity trong Razor khi cần chống mojibake.
- Giữ nguyên các thay đổi không liên quan đang có trong working tree.

---

### Task 1: Metadata truyện và mapping MangaDex

**Files:**
- Modify: `backend/Data/MangaDbSeeder.cs`
- Modify: `backend/Services/MangaDexService.cs`
- Modify: `backend/Controllers/AdminController.cs`
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/js/admin.js`
- Test: `backend.Tests/MangaDexMetadataTests.cs`
- Test: `backend.Tests/AdminMetadataTests.cs`

**Interfaces:**
- Produces: `MangaDexMetadataMapper.SelectPrimaryFormat(IEnumerable<MangaDexTagDto>) -> MangaFormat`.
- Produces: payload manga có `themeIds: number[]`; API chi tiết trả `themes`.

- [ ] **Step 1: Viết test đỏ** cho ưu tiên Format, taxonomy seed và payload cập nhật Theme.
- [ ] **Step 2: Chạy** `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter "MangaDexMetadataTests|AdminMetadataTests"`; mong đợi FAIL vì mapper/theme UI chưa tồn tại.
- [ ] **Step 3: Implement** mapper ưu tiên `OneShot > WebComic/Long Strip > Adaptation > Book/Novel > Comic`, bổ sung taxonomy Genre/Theme đầy đủ vào seeder, render checkbox Theme và gửi/điền lại `themeIds` trong form admin.
- [ ] **Step 4: Cập nhật preview MangaDex** để nhóm riêng Genre, Theme, Demographic, Format và escape toàn bộ text.
- [ ] **Step 5: Chạy test/build**; mong đợi toàn bộ test task đạt và build 0 lỗi.

### Task 2: API sửa chapter an toàn

**Files:**
- Modify: `backend/Controllers/AdminController.cs`
- Create: `backend/Services/ChapterUpdateService.cs`
- Test: `backend.Tests/ChapterUpdateServiceTests.cs`

**Interfaces:**
- Produces: GET `/api/admin/chapter/{id}` trả `id`, `mangaId`, `source`, `chapterNumber`, `title`, `pages`.
- Produces: PUT `/api/admin/chapter/{id}` nhận `{ chapterNumber, title, pageUrls }`.
- Produces: `ChapterUpdateService.ApplyLocalPages(Chapter, IReadOnlyList<string>)` đánh số trang liên tục.

- [ ] **Step 1: Viết test đỏ** cho reorder/delete/add page, chapter Local trùng số và MangaDex từ chối sửa pages.
- [ ] **Step 2: Chạy** `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter ChapterUpdateServiceTests`; mong đợi FAIL vì service/API chưa tồn tại.
- [ ] **Step 3: Implement GET/PUT** với `RequireAdmin`, transaction, validation URL và duplicate check; không nhận `mangaId` trong PUT.
- [ ] **Step 4: Với Local**, thay danh sách Page trong transaction và đánh lại `PageNumber`; với MangaDex chỉ cập nhật metadata khi `pageUrls` null.
- [ ] **Step 5: Chạy test/build**; mong đợi PASS và 0 lỗi.

### Task 3: Giao diện sửa chapter và xử lý ảnh lỗi

**Files:**
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/js/admin.js`
- Test: `backend.Tests/js/admin-chapter-edit.test.cjs`

**Interfaces:**
- Consumes: API Task 2 và API upload hiện có.
- Produces: state `editingChapterId`, `editingChapterSource`, `uploadedChapterPages`; form create/edit dùng chung.

- [ ] **Step 1: Viết Node test đỏ** cho helper tạo payload Local/MangaDex, trạng thái ảnh lỗi và reorder pages.
- [ ] **Step 2: Chạy** `node --test backend.Tests/js/admin-chapter-edit.test.cjs`; mong đợi FAIL vì helper chưa tồn tại.
- [ ] **Step 3: Thêm danh sách chapter** dưới dropdown truyện, nút sửa, nút hủy sửa và tiêu đề chế độ form.
- [ ] **Step 4: Implement edit flow**: tải chi tiết chapter; khóa truyện; render page; ảnh `error` chuyển sang placeholder có nút thay/xóa; upload thành công mới thay URL; MangaDex khóa vùng pages.
- [ ] **Step 5: Submit PUT/POST phù hợp**, khóa nút trong request, khôi phục khi lỗi và dùng toast message cụ thể.
- [ ] **Step 6: Chạy Node test và syntax check**; mong đợi PASS.

### Task 4: Toast và encoding reader

**Files:**
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/js/admin.js`
- Modify: `backend/Views/ChapterView/Read.cshtml`
- Modify: `backend/wwwroot/js/reader.js`
- Test: `backend.Tests/EncodingRegressionTests.cs`

**Interfaces:**
- Produces: `showToast(message, type)` với type `success|error|warning`.

- [ ] **Step 1: Viết test đỏ** quét các chuỗi mojibake đã biết (`ChÆ`, `TrÆ`, `Tiá`, `ÄÃ`) trong các nhãn reader và khẳng định toast HTML không chứa câu mặc định.
- [ ] **Step 2: Chạy** `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter EncodingRegressionTests`; mong đợi FAIL trên nội dung hiện tại.
- [ ] **Step 3: Xóa nội dung mặc định toast**, chuẩn hóa kiểu toast và sửa các call-site truyền `'warning'`.
- [ ] **Step 4: Thay chuỗi reader liên quan bằng HTML entity hoặc Unicode escape**, gồm Chương, Chương trước, Chương tiếp theo, Đóng và nhãn chapter.
- [ ] **Step 5: Chạy toàn bộ test**, `node --check` cho JavaScript, `dotnet build -c Release` và `git diff --check` trên file phạm vi; tất cả phải đạt trước bàn giao.
