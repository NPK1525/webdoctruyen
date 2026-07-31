# Design Patterns Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo tài liệu học thuật chính xác về sáu mẫu thiết kế đang được sử dụng trong WebDocTruyen, kèm code thực tế và giới hạn của từng kết luận.

**Architecture:** Tài liệu được tổ chức theo ba nhóm GoF: khởi tạo, cấu trúc và hành vi. Mỗi mẫu gồm mục đích, thành phần tham gia, code trích từ repository, luồng hoạt động, ưu nhược điểm và mức độ áp dụng; phần cuối giải thích vì sao 14 mẫu còn lại không được tính.

**Tech Stack:** Markdown, Mermaid, C#, ASP.NET Core MVC, Dependency Injection, Entity Framework Core.

## Global Constraints

- Chỉ ghi nhận sáu mẫu đã được xác minh: Singleton, Builder, Adapter, Strategy, Facade và Chain of Responsibility.
- Phân biệt rõ mẫu do code nghiệp vụ thể hiện với mẫu do ASP.NET Core cung cấp.
- Không gọi hàm CRUD là Factory Method, lifecycle hook là Observer, cache nội bộ là Proxy hoặc MVC filter là Decorator GoF.
- Đoạn code phải khớp với source hiện tại và chỉ giữ phần cần thiết để chứng minh mẫu.

---

### Task 1: Tạo tài liệu phân tích design patterns

**Files:**
- Create: `docs/design-patterns.md`

**Interfaces:**
- Consumes: `backend/Program.cs`, `backend/Services/Email/IEmailSender.cs`, `backend/Services/Email/SmtpEmailSender.cs`, `backend/Services/PasswordResetService.cs`, `backend/Services/MangaDexImportService.cs`, `backend/Services/TitleSubmissionService.cs`
- Produces: Tài liệu độc lập `docs/design-patterns.md`

- [ ] **Step 1: Viết phần tổng quan và tiêu chí đánh giá**

Ghi rõ dự án có sáu mẫu trong phạm vi 20 mẫu được khảo sát và định nghĩa mức độ “code dự án” so với “framework”.

- [ ] **Step 2: Viết sáu mục phân tích**

Mỗi mục phải có: mục đích, vị trí, thành phần, code, luồng hoạt động, lợi ích và giới hạn kết luận.

- [ ] **Step 3: Viết phần đối chiếu 14 mẫu không có**

Thêm bảng giải thích ngắn gọn và các trường hợp dễ gán nhầm.

- [ ] **Step 4: Kiểm tra tài liệu**

Run:

```powershell
Select-String -Path docs\design-patterns.md -Pattern 'TBD|TODO|Factory Method.*đang sử dụng|Observer.*đang sử dụng|Proxy.*đang sử dụng'
git diff --check -- docs/design-patterns.md
```

Expected: Không có placeholder hoặc kết luận sai; `git diff --check` không báo lỗi nội dung.
