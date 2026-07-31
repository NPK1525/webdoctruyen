# Advanced Author Search Pagination Implementation Plan

> **For the implementation agent:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task, with verification after each task.

## Goal

Cho phép bộ lọc tìm kiếm nâng cao tìm tác giả/nghệ sĩ từ dữ liệu local với phân trang phía máy chủ. Người dùng có thể gõ tên, chọn kết quả, hoặc nhập đúng tên rồi nhấn Enter; các ID đã chọn vẫn được giữ khi đổi trang và khi mở lại URL tìm kiếm.

## Architecture and constraints

- Giữ nguyên `GET /api/author` để Admin và các màn hình hiện có không bị ảnh hưởng.
- Thêm `GET /api/author/search` và `GET /api/author/lookup` phục vụ riêng Advanced Search.
- Bộ lọc manga tiếp tục gửi `authorIds`/`artistIds`; không đổi hợp đồng `MangaController`.
- Phân trang, tìm kiếm và lọc vai trò thực hiện ở server; client chỉ giữ lựa chọn và trang hiện tại.
- Không tải toàn bộ danh sách tác giả khi mở Advanced Search.
- Giới hạn `pageSize` tối đa 20, loại bỏ ID trùng, xử lý phản hồi cũ không ghi đè phản hồi mới.
- Giữ giao diện dark/light và i18n hiện tại; không thêm Bootstrap hoặc route Admin mới.

## Task 1 — Add server-side author search and lookup APIs (TDD)

**Files:** `backend.Tests/AuthorSearchApiTests.cs`, `backend/Controllers/AuthorController.cs`

- [ ] Viết test đỏ cho: phân trang và ưu tiên exact match không phân biệt hoa thường; lọc `author`/`artist` theo vai trò kể cả `Story & Art`; giới hạn page size và từ chối role lạ; lookup loại ID trùng và bỏ ID không tồn tại.
- [ ] Tạo dữ liệu test có tác giả, manga và liên kết `MangaAuthor` được thêm rõ ràng vào `MangaDbContext`, rồi gọi `SaveChangesAsync` để test phản ánh đúng quan hệ thật.
- [ ] Thêm `Search(string? q, string? role = "author", int page = 1, int pageSize = 10)`:
  - Chuẩn hóa role; role khác `author`/`artist` trả `BadRequest`.
  - `AsNoTracking`, lọc vai trò trên query quan hệ, tìm `Name` theo `Contains` không phân biệt hoa thường.
  - Trả `{ items, page, pageSize, totalItems, totalPages }`, item gồm `id`, `name`, `roles` đã normalize.
  - Sắp xếp exact match trước, sau đó prefix match, cuối cùng theo tên và ID ổn định.
  - Clamp page tối thiểu 1 và pageSize trong khoảng 1..20.
- [ ] Thêm `Lookup(string? ids)`:
  - Parse CSV GUID, deduplicate, tối đa 20 ID, bỏ ID không tồn tại.
  - Trả item `{ id, name, roles }` theo thứ tự ID đầu vào; dùng `AsNoTracking`.
- [ ] Chạy test mới; chỉ chuyển sang Task 2 khi toàn bộ test API xanh.

## Task 2 — Isolate a reusable client provider (TDD)

**Files:** `backend/wwwroot/js/advanced-person-search.js`, `backend.Tests/js/advanced-person-search.test.cjs`

- [ ] Viết test đỏ cho URL/query serialization, giá trị mặc định, kết quả search/lookup, và lỗi HTTP được chuyển thành lỗi JavaScript có thông điệp rõ ràng.
- [ ] Tạo `window.AdvancedPersonSearch.create({ apiBase = '/api/author', fetchImpl = window.fetch })` với hai hàm:
  - `search({ query, role, page, pageSize })` gọi `/search` và trả JSON.
  - `lookup(ids)` gọi `/lookup?ids=...` với ID đã deduplicate.
- [ ] Kiểm tra `response.ok`; không nuốt lỗi mạng; không phụ thuộc DOM để có thể test độc lập.
- [ ] Chạy Node test mới và test JS hiện có.

## Task 3 — Integrate the provider into Advanced Search (TDD)

**Files:** `backend/wwwroot/js/advanced-search-filters.js`, `backend/wwwroot/js/advanced-search.js`, `backend/Views/MangaView/Index.cshtml`, `backend.Tests/js/advanced-search-filters.test.cjs`

- [ ] Viết/điều chỉnh test contract xác nhận script provider được nạp trước filter, startup không còn gọi `/api/author` để tải toàn bộ, có pagination marker và xử lý Enter exact.
- [ ] Trong `advanced-search-filters.js`:
  - Nhận `peopleProvider`, giữ `selectedPeople` theo ID và dữ liệu đã hydrate.
  - Tách trạng thái trang/loading/error cho author và artist; debounce input khoảng 250ms.
  - Dùng request sequence để bỏ qua response cũ; render loading/error/empty và footer phân trang.
  - Click một option sẽ chọn ID; Enter chỉ tự chọn khi có đúng một kết quả exact không phân biệt hoa thường; nếu nhiều exact thì không tự chọn.
  - Nút Previous/Next đổi trang nhưng không làm mất chip đã chọn; selected chip có nút xóa.
  - `setState`/URL parsing giữ ID, sau đó gọi `lookup` để hiển thị tên cho các ID không nằm ở trang hiện tại.
- [ ] Trong `advanced-search.js`:
  - Bỏ trường `people` tải từ `/api/author`; khởi tạo provider và truyền vào filter component.
  - Chờ hydrate selected IDs trước khi fetch manga đầu tiên; thay đổi lựa chọn vẫn gọi fetch manga hiện tại.
  - Khi đổi ngôn ngữ, render lại label nhưng không reset query, trang hoặc chip.
- [ ] Trong `Index.cshtml`, nạp `/js/advanced-person-search.js` trước `advanced-search-filters.js`, tăng version query để tránh cache cũ.
- [ ] Chạy toàn bộ JS tests; xác nhận các filter tag hiện tại không thay đổi.

## Task 4 — Styling, localization, and end-to-end verification

**Files:** `backend/wwwroot/css/style.css`, `backend/wwwroot/locales/vi.json`, `backend/wwwroot/locales/en.json`, relevant JS tests

- [ ] Thêm style cho loading/error/pagination của combobox theo biến màu chung, có focus/hover rõ và không làm menu tràn khỏi modal.
- [ ] Thêm khóa i18n: `search.peopleLoading`, `search.peopleLoadError`, `search.peoplePage`, `search.previous`, `search.next`, `search.removePerson`; cập nhật cả Việt và Anh.
- [ ] Chạy:
  - `dotnet test backend.Tests\MangaNPK.Tests.csproj --filter "FullyQualifiedName!~SourceEncodingTests"`
  - toàn bộ `node --test backend.Tests\js\*.test.cjs`.
- [ ] Manual smoke test: mở Advanced Search; gõ tên local author/artist; chuyển trang; nhập đúng tên rồi Enter; chọn rồi xóa chip; refresh URL có `authorIds`/`artistIds`; đổi ngôn ngữ; xác nhận manga trả về đúng theo vai trò.
- [ ] Kiểm tra `git diff --check`, review không có endpoint Admin bị đổi và không có truy vấn tải toàn bộ author list.

## Commit checkpoints

1. `test(api): cover paginated author search and lookup`
2. `feat(api): add paginated author search endpoints`
3. `test(ui): cover advanced person search provider and selection`
4. `feat(ui): paginate author and artist filters`
5. `style(i18n): localize advanced person pagination`

