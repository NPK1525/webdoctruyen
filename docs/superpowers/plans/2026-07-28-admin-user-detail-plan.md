# Admin User Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay ngày tạo trong danh sách người dùng bằng hành động và chuyển việc chỉnh sửa sang trang chi tiết riêng.

**Architecture:** Danh sách tiếp tục dùng `admin-users.js` và API phân trang hiện tại. Trang `/admin/users/{id}` dùng một JavaScript riêng để đọc chi tiết qua API, lưu hồ sơ và khóa/mở khóa mà không lặp logic của tab danh sách.

**Tech Stack:** ASP.NET Core MVC/API, Entity Framework Core, Razor, JavaScript, CSS, xUnit, Node test runner.

## Global Constraints

- Không trả hoặc hiển thị mật khẩu.
- Không cho tự khóa, tự hạ quyền hoặc vô hiệu hóa admin cuối cùng.
- Dùng giao diện admin hiện tại.
- Không sửa ngoài phạm vi quản lý người dùng.

---

### Task 1: API và route chi tiết người dùng

**Files:**
- Modify: `backend/Controllers/AdminUsersController.cs`
- Modify: `backend/Controllers/AdminViewController.cs`
- Modify: `backend.Tests/AdminUserManagementTests.cs`

- [ ] Viết kiểm tra thất bại cho `GET api/admin/users/{id}` và route `/admin/users/{id}`.
- [ ] Chạy kiểm tra để xác nhận thiếu endpoint.
- [ ] Thêm endpoint trả `AdminUserListItemDto` và action MVC trả view hoặc `404`.
- [ ] Chạy lại kiểm tra.

### Task 2: Danh sách và trang chi tiết

**Files:**
- Modify: `backend/Views/AdminView/Index.cshtml`
- Modify: `backend/wwwroot/js/admin-users.js`
- Modify: `backend/wwwroot/css/style.css`
- Create: `backend/Views/AdminView/UserDetail.cshtml`
- Create: `backend/wwwroot/js/admin-user-detail.js`
- Modify: `backend.Tests/js/admin-user-management.test.cjs`

- [ ] Viết kiểm tra thất bại xác nhận danh sách bỏ ngày tạo, có liên kết chi tiết và trang chi tiết có form cùng nút khóa.
- [ ] Chạy kiểm tra để xác nhận giao diện còn thiếu.
- [ ] Bỏ editor nội tuyến, thay ngày tạo bằng hành động và tạo trang chi tiết đồng bộ.
- [ ] Bump phiên bản `admin-users.js` để trình duyệt không giữ giao diện cũ.
- [ ] Chạy kiểm tra JavaScript, kiểm tra .NET, build và `git diff --check`.
