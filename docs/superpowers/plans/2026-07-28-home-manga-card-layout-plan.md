# Home Manga Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách tên truyện khỏi khung ảnh và giữ mọi thẻ trong băng chuyền trang chủ đồng đều khi tên dài.

**Architecture:** Giữ dữ liệu và Swiper hiện tại, chỉ thay cấu trúc HTML do `renderMangaGrid` tạo ra. CSS cần thiết được biểu diễn bằng class riêng trong stylesheet chung để có thể kiểm tra và bảo trì.

**Tech Stack:** ASP.NET Core MVC, JavaScript, CSS, Node test runner.

## Global Constraints

- Khung bo góc chỉ chứa ảnh và nhãn loại truyện.
- Tên nằm bên ngoài khung, tối đa hai dòng, không có tooltip.
- Toàn bộ mục vẫn mở được trang chi tiết.
- Không thay đổi các loại thẻ truyện khác.

---

### Task 1: Đồng bộ thẻ truyện trang chủ

**Files:**
- Create: `backend.Tests/js/home-manga-card-layout.test.cjs`
- Modify: `backend/wwwroot/js/index.js`
- Modify: `backend/wwwroot/css/style.css`

**Interfaces:**
- Consumes: `renderMangaGrid()` và dữ liệu manga hiện tại.
- Produces: `.home-manga-item`, `.home-manga-cover-frame`, `.home-manga-card-title`.

- [ ] **Step 1: Viết kiểm tra thất bại**

Kiểm tra mã dựng thẻ sử dụng ba class mới, tiêu đề không nằm trong khung ảnh, CSS giữ ảnh tỉ lệ `2/3`, vùng tên cao hai dòng và có `line-clamp: 2`.

- [ ] **Step 2: Chạy kiểm tra để xác nhận thất bại**

Run: `node --test backend.Tests/js/home-manga-card-layout.test.cjs`

Expected: FAIL vì các class bố cục mới chưa tồn tại.

- [ ] **Step 3: Triển khai tối thiểu**

Đổi cấu trúc thẻ thành một mục bấm được gồm khung ảnh riêng và tiêu đề riêng. Chuyển các thuộc tính bố cục liên quan từ inline style sang ba class mới trong `style.css`.

- [ ] **Step 4: Chạy kiểm tra và bộ kiểm tra đầy đủ**

Run: `node --test backend.Tests/js/home-manga-card-layout.test.cjs`

Expected: PASS.

Run: `node --test backend.Tests/js`

Expected: toàn bộ kiểm tra PASS.

Run: `dotnet build backend/MangaNPK.csproj -c Release --no-restore --verbosity quiet`

Expected: build thành công, không có lỗi.

- [ ] **Step 5: Kiểm tra định dạng thay đổi**

Run: `git diff --check`

Expected: không có lỗi khoảng trắng.
