# Remove Legacy Chapter Upload UI Design

## Mục tiêu

Loại bỏ giao diện upload chapter riêng được mở từ nút **Upload Chapter** trên trang chi tiết truyện, vì trang Admin hiện tại đã có luồng **Thêm chương mới**. Đồng thời tiêu đề danh sách chương không hiển thị tổng số trong ngoặc.

## Thay đổi

- Xóa nút `Upload Chapter` khỏi trang chi tiết truyện.
- Đổi tiêu đề `Danh sách chương (38)` thành `Danh sách chương` ở cả HTML ban đầu và sau khi JavaScript tải dữ liệu.
- Xóa liên kết dấu `+` tới giao diện upload cũ trong danh sách manga tĩnh.
- Xóa view `Views/AdminView/ChapterCreate.cshtml` và các CSS/JavaScript chỉ được view này sử dụng.
- Xóa POST action upload cũ khỏi `AdminViewController`.
- Giữ GET `/admin/chapter/create/{mangaId}` làm redirect về trang Admin để bookmark hoặc link cũ không trả 404.
- Bỏ ngoại lệ quyền contributor dành riêng cho action `ChapterCreate`; quyền của API sửa/thêm chương hiện tại vẫn giữ nguyên.
- Giữ nguyên mục **Thêm chương mới**, API chapter, validation upload và dịch vụ chapter đang dùng trong trang Admin.

## Kiểm thử

- Contract test xác nhận trang chi tiết không còn nút hoặc URL upload cũ.
- Contract test xác nhận tiêu đề danh sách chương không nối số lượng.
- Contract test xác nhận view và asset upload tĩnh đã được xóa.
- Controller test xác nhận GET URL cũ chuyển hướng về Admin và không còn POST action cũ.
- Chạy toàn bộ JavaScript tests, backend tests và build.

## Tiêu chí hoàn thành

- Không còn giao diện upload riêng khi xem chi tiết truyện.
- Admin vẫn thêm chương qua giao diện Admin hiện tại.
- URL cũ chuyển về trang Admin.
- Danh sách chương chỉ hiện nhãn `Danh sách chương`.
