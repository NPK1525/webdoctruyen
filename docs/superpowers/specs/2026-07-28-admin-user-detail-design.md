# Thiết kế trang chi tiết người dùng cho admin

## Mục tiêu

Danh sách quản lý người dùng luôn hiển thị rõ hành động chỉnh sửa và khóa tài khoản. Việc chỉnh sửa được thực hiện trên một trang chi tiết riêng.

## Danh sách người dùng

- Bỏ ngày tạo khỏi mỗi dòng.
- Dùng vị trí đó cho hai hành động `Xem / Chỉnh sửa` và `Khóa` hoặc `Mở khóa`.
- `Xem / Chỉnh sửa` chuyển đến `/admin/users/{id}`.
- Khóa hoặc mở khóa ngay tại danh sách và tải lại trạng thái sau khi thành công.
- Không cho admin tự khóa chính mình.

## Trang chi tiết

- Dùng giao diện, màu sắc, header và sidebar chung của khu vực admin.
- Hiển thị tên đăng nhập, email, vai trò, ảnh đại diện, huy hiệu, tiểu sử và trạng thái tài khoản.
- Cho phép lưu các trường chỉnh sửa thông qua API quản trị hiện có.
- Có nút khóa hoặc mở khóa trên trang chi tiết.
- Có nút quay lại danh sách người dùng tại `/admin` và tự mở tab người dùng.
- Hiển thị lỗi API bằng thông báo dễ hiểu.

## Bảo vệ

- Route giao diện và API chỉ dành cho admin.
- Không trả `PasswordHash`.
- Không cho tự khóa, tự hạ quyền hoặc khóa/hạ quyền admin hoạt động cuối cùng.
- Kiểm tra trùng tên đăng nhập và email tiếp tục dùng quy tắc hiện có.

## Kiểm thử

- Kiểm tra API lấy một người dùng không chứa mật khẩu.
- Kiểm tra route trang chi tiết.
- Kiểm tra danh sách không còn ngày tạo và có liên kết chi tiết cùng nút khóa.
- Kiểm tra trang chi tiết chứa đầy đủ form, lưu và khóa/mở khóa.
