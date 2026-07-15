# Codebase Cleanup Roadmap Design

## Mục tiêu

Refactor toàn bộ backend và frontend theo nhiều giai đoạn có thể kiểm thử độc lập, giữ nguyên giao diện và hành vi hiện tại. Chỉ thay đổi hiển thị khi sửa lỗi đã xác định; không thiết kế lại màu sắc, bố cục, kích thước hoặc responsive.

## Nguyên tắc

- Mỗi giai đoạn bắt đầu bằng test mô tả hành vi hiện tại.
- Không thay đổi API hoặc DOM contract nếu chưa có lớp tương thích.
- Không gom toàn bộ refactor vào một commit.
- Không xóa migration đã áp dụng hoặc dữ liệu người dùng.
- Mọi file văn bản phải là UTF-8 hợp lệ.
- Không sửa các thay đổi ngoài phạm vi của giai đoạn đang thực hiện.
- Build và test phải đạt trước khi chuyển giai đoạn.

## Roadmap

### Giai đoạn 1: Ổn định nền

- Lập danh mục file nguồn và các entry point thực sự được sử dụng.
- Xác định CSS/HTML/JavaScript trùng hoặc không còn được tham chiếu; chưa xóa khi chưa có bằng chứng.
- Thêm kiểm tra encoding cho C#, Razor, JavaScript, CSS, JSON và locale.
- Ghi nhận các chuỗi mojibake hiện có và sửa theo nhóm có test hồi quy.
- Thiết lập baseline build, backend tests, JavaScript tests và syntax check.
- Thêm `.editorconfig` phù hợp với codebase nhưng không chạy format hàng loạt.

### Giai đoạn 2: Backend

- Tách `AdminController` theo Manga, Chapter, Title Draft và MangaDex.
- Di chuyển nghiệp vụ, validation và transaction vào service tập trung.
- Tách DTO khỏi controller.
- Chuẩn hóa authorization User/Admin/contributor.
- Giảm query trùng và N+1, giữ nguyên response contract.

### Giai đoạn 3: Frontend JavaScript

- Tách `admin.js`, `common.js`, `reader.js` và `detail.js` theo trách nhiệm.
- Giữ nguyên global API cần thiết trong giai đoạn chuyển tiếp.
- Gom helper fetch, escape HTML, toast, pagination và enum mapping.
- Loại state/listener trùng và bổ sung unit test cho module thuần.

### Giai đoạn 4: Razor và CSS

- Tách view lớn thành partial có dữ liệu vào rõ ràng.
- Loại inline style lặp lại bằng class tương đương.
- Xác minh vai trò của `backend/wwwroot/css/style.css` và `backend/wwwroot/style.css`, sau đó hợp nhất an toàn.
- Dùng kiểm tra ảnh hoặc browser smoke test để chứng minh giao diện không đổi.

### Giai đoạn 5: Dữ liệu và kiểm thử tích hợp

- Rà model, migration, snapshot và seeder.
- Bổ sung test API/quyền/database cho các luồng chính.
- Chạy kiểm thử end-to-end cho đăng nhập, tìm truyện, đọc truyện, đóng góp truyện, duyệt, upload chapter và Admin.

## Đặc tả giai đoạn 1

### Baseline

Ghi một báo cáo máy đọc được hoặc Markdown chứa:

- Danh sách project và entry point.
- Các file trên 500 dòng.
- Các file tĩnh có tên/chức năng trùng.
- Các script/style được tham chiếu bởi từng layout/view chính.
- Kết quả build/test ban đầu và các giới hạn môi trường như LocalDB/cổng đang sử dụng.

Baseline không được tự động xóa file.

### Encoding

Thêm test quét các extension `.cs`, `.cshtml`, `.js`, `.css`, `.json` và `.md` trong source, bỏ qua `bin`, `obj`, `.git`, file upload và thư mục dữ liệu runtime. Test phải:

- Giải mã UTF-8 nghiêm ngặt.
- Báo chính xác file không hợp lệ.
- Phát hiện các mẫu mojibake đã biết trong nội dung người dùng nhìn thấy.
- Cho phép Unicode tiếng Việt hợp lệ và HTML entity.

Sửa chuỗi mojibake theo từng file có test; không thay thế toàn cục mù quáng.

### EditorConfig

Thêm hoặc cập nhật `.editorconfig` với:

- UTF-8.
- Dòng kết thúc CRLF cho Windows project hiện tại.
- Newline cuối file.
- Loại trailing whitespace.
- Indent 4 spaces cho C#, 2 spaces cho JavaScript/CSS/HTML/Razor/JSON.

Không chạy format toàn bộ repository trong giai đoạn này vì sẽ làm diff quá lớn và khó phân biệt thay đổi chức năng.

### Kiểm thử nền

Lệnh chuẩn của giai đoạn 1:

```text
dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --no-restore
dotnet build backend/MangaNPK.csproj -c Release --no-restore
node --check cho từng JavaScript entry point
node --test cho từng file backend.Tests/js/*.test.cjs
```

Nếu LocalDB không chạy, unit/build vẫn phải đạt và báo rõ smoke test database chưa thực hiện; không coi lỗi môi trường là test chức năng đạt.

## Tiêu chí hoàn thành giai đoạn 1

- Có baseline rõ ràng, tái tạo được.
- Có test UTF-8 và mojibake chạy tự động.
- Các chuỗi lỗi encoding trong luồng chính được sửa và bảo vệ bằng test.
- `.editorconfig` tồn tại nhưng không gây diff format hàng loạt.
- Build Release không lỗi/cảnh báo mới.
- Backend tests, JavaScript tests và syntax checks đều đạt.
- Không có thay đổi giao diện có chủ ý.

