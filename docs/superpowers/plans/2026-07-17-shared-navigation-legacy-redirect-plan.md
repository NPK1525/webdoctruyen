# Shared Navigation and Legacy Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đồng bộ Hồ sơ/MDList với giao diện chung, loại bỏ mục tài khoản chưa hoạt động và chuyển các URL legacy sang route MVC.

**Architecture:** `common.js` tiếp tục là nguồn duy nhất dựng header/sidebar. Hai trang tĩnh opt-in để sidebar legacy bị thay thế. Một resolver thuần C# xác định destination của URL legacy và middleware chạy trước `UseStaticFiles()` thực hiện redirect.

**Tech Stack:** ASP.NET Core 10, Razor/static HTML, vanilla JavaScript, Node test runner, xUnit.

## Global Constraints

- Giữ nguyên nội dung và chức năng chính của `profile.html` và `lists.html`.
- Không xóa backend notification; chỉ bỏ giao diện chuông.
- Không thêm trang Báo cáo, Gói đăng ký hoặc Cài đặt mới.
- Không thay đổi bố cục nội dung chính của Hồ sơ và MDList.
- Không commit vì workspace đang chứa thay đổi chưa hoàn tất của người dùng.

---

### Task 1: Menu tài khoản và sidebar dùng chung

**Files:**
- Modify: `backend/wwwroot/js/common.js`
- Modify: `backend/wwwroot/profile.html`
- Modify: `backend/wwwroot/lists.html`
- Modify: `backend.Tests/js/common-auth-contract.test.cjs`

**Interfaces:**
- Consumes: `renderHeaderUserArea()`, `renderUnifiedSidebarDrawer()`, `initSidebar()`.
- Produces: `data-use-unified-sidebar="true"` opt-in và các URL `/profile.html`, `/lists.html`.

- [ ] **Step 1: Viết failing contract tests**

Thêm assertion xác nhận `common.js` không chứa `notification-bell`, `notification-dropdown`, `user.reports`, `user.subscription`; Cài đặt dùng `/profile.html`; `nav-lists-btn` dùng `/lists.html`; và hai trang tĩnh có `data-use-unified-sidebar="true"`.

- [ ] **Step 2: Chạy test để xác nhận RED**

Run: `node --test backend.Tests/js/common-auth-contract.test.cjs`

Expected: FAIL vì chuông/mục giả còn tồn tại, sidebar MDLists trỏ `/library` và hai trang chưa opt-in.

- [ ] **Step 3: Sửa menu và sidebar tối thiểu**

Trong `renderUnifiedSidebarDrawer()` chỉ giữ nguyên drawer có con khi `drawer.dataset.useUnifiedSidebar !== 'true'`. Xóa markup chuông/dropdown, Báo cáo và Gói đăng ký. Đổi Cài đặt thành `<a href="/profile.html">`. Đổi handler MDLists sang `/lists.html`. Gắn `data-use-unified-sidebar="true"` lên `#sidebar-drawer` của Hồ sơ và MDList.

- [ ] **Step 4: Chạy test để xác nhận GREEN**

Run: `node --test backend.Tests/js/common-auth-contract.test.cjs`

Expected: toàn bộ test trong file PASS.

---

### Task 2: Điều hướng hợp lệ và cache-buster

**Files:**
- Modify: `backend/Views/Home/Index.cshtml`
- Modify: `backend/wwwroot/profile.html`
- Modify: mọi consumer `common.js` dưới `backend/Views` và `backend/wwwroot`
- Modify: `backend.Tests/js/common-auth-contract.test.cjs`

**Interfaces:**
- Consumes: route `/manga`, `/`, `/profile.html`.
- Produces: mọi consumer dùng `/js/common.js?v=5.2` hoặc `js/common.js?v=5.2`.

- [ ] **Step 1: Viết failing tests cho route/cache**

Đọc Home/Profile và danh sách consumer, assertion hai link recommended là `/manga`, nút quay lại Hồ sơ là `/`, và mọi consumer có version `5.2`.

- [ ] **Step 2: Chạy test để xác nhận RED**

Run: `node --test backend.Tests/js/common-auth-contract.test.cjs`

Expected: FAIL ở `/titles/recommended`, `index.html`, hoặc version cũ.

- [ ] **Step 3: Sửa route và version**

Đổi `/titles/recommended` thành `/manga`, `href="index.html"` thành `href="/"`, và thay mọi query version của `common.js` thành `5.2` mà không đổi thứ tự script.

- [ ] **Step 4: Chạy test để xác nhận GREEN**

Run: `node --test backend.Tests/js/common-auth-contract.test.cjs`

Expected: PASS.

---

### Task 3: Redirect URL legacy trước static files

**Files:**
- Create: `backend/Services/LegacyRouteRedirect.cs`
- Modify: `backend/Program.cs`
- Create: `backend.Tests/LegacyRouteRedirectTests.cs`

**Interfaces:**
- Produces: `LegacyRouteRedirect.Resolve(string? path, string? mangaId, string? chapterId) -> string?`.
- Consumes: `HttpContext.Request.Path`, query `mangaId`, query `chapterId`.

- [ ] **Step 1: Viết failing xUnit tests**

Test các mapping: `/index.html` -> `/`; `/detail.html?mangaId=12` -> `/manga/12`; ID thiếu/sai -> `/manga`; `/reader.html?chapterId=34` -> `/chapter/34`; ID thiếu/sai -> `/`; route khác -> `null`.

- [ ] **Step 2: Chạy test để xác nhận RED**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter LegacyRouteRedirectTests`

Expected: FAIL vì resolver chưa tồn tại.

- [ ] **Step 3: Viết resolver tối thiểu**

Tạo static class, so sánh path không phân biệt hoa thường, chỉ chấp nhận integer dương và trả destination đúng theo test.

- [ ] **Step 4: Nối middleware trước `UseStaticFiles()`**

Đọc destination từ resolver; nếu khác `null`, gọi `context.Response.Redirect(destination, permanent: false)` và return; nếu không thì `await next()`.

- [ ] **Step 5: Chạy focused tests**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore --filter LegacyRouteRedirectTests`

Expected: PASS.

---

### Task 4: Xác minh toàn bộ

**Files:**
- Test: `backend.Tests/js/*.test.cjs`
- Test: `backend.Tests/MangaNPK.Tests.csproj`

**Interfaces:**
- Consumes: toàn bộ thay đổi Task 1-3.
- Produces: bằng chứng test/build và smoke check route.

- [ ] **Step 1: Chạy toàn bộ JavaScript tests**

Run: `$files = Get-ChildItem backend.Tests/js -Filter *.test.cjs | ForEach-Object { $_.FullName }; node --test $files`

Expected: 0 failed.

- [ ] **Step 2: Chạy toàn bộ .NET tests**

Run: `dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore`

Expected: 0 failed.

- [ ] **Step 3: Build Release**

Run: `dotnet build backend/MangaNPK.csproj -c Release --no-restore`

Expected: 0 errors.

- [ ] **Step 4: Smoke test redirect trên app cục bộ**

Gửi GET tới ba URL legacy có/không có ID và xác nhận `Location` đúng; kiểm tra `/profile.html` và `/lists.html` vẫn trả 200 sau khi theo redirect policy.
