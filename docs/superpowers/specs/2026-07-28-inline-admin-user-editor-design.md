# Thiết kế màn chỉnh sửa người dùng trong Admin Control Panel

## Mục tiêu

Khi quản trị viên bấm **Xem / Chỉnh sửa** trong danh sách người dùng, giao diện phải hoạt động giống luồng chỉnh sửa truyện: chuyển nội dung chính của Admin Control Panel sang một màn chỉnh sửa, không mở route hay trang MVC riêng và không dùng drawer phủ bên phải.

## Giao diện và điều hướng

- Giữ mục **Quản lý người dùng** trong menu quản trị.
- Thêm một tab nội bộ ẩn dành cho **Chỉnh sửa người dùng**.
- Nút **Xem / Chỉnh sửa** tải dữ liệu người dùng rồi gọi cơ chế `switchTab(...)` hiện có.
- Màn chỉnh sửa dùng toàn bộ chiều rộng khu vực nội dung quản trị.
- Có nút **Quay lại danh sách người dùng**; khi bấm sẽ trở về tab quản lý người dùng và giữ nguyên tìm kiếm, bộ lọc, phân trang.
- Xóa hoàn toàn overlay, drawer và trạng thái khóa cuộn của giao diện cũ.

## Chức năng

Màn chỉnh sửa tiếp tục hỗ trợ:

- Sửa tên đăng nhập, email, vai trò, URL ảnh đại diện, badge và tiểu sử.
- Khóa hoặc mở khóa tài khoản, trừ tài khoản quản trị viên đang đăng nhập.
- Đặt lại mật khẩu người dùng mà không cần mật khẩu hiện tại.
- Hiển thị lỗi API ngay trong màn chỉnh sửa và cập nhật danh sách sau khi lưu thành công.

Các endpoint backend hiện tại được giữ nguyên.

## Luồng dữ liệu

1. Quản trị viên bấm **Xem / Chỉnh sửa**.
2. JavaScript gọi `GET /api/admin/users/{id}`.
3. Khi tải thành công, dữ liệu được đổ vào form và giao diện chuyển sang tab chỉnh sửa người dùng.
4. Lưu, khóa/mở khóa và đặt lại mật khẩu dùng các endpoint hiện có.
5. Nút quay lại chuyển về danh sách mà không đặt lại trạng thái tìm kiếm, bộ lọc hoặc trang.

## Xử lý lỗi

- Nếu không tải được người dùng, vẫn ở danh sách và hiển thị thông báo lỗi.
- Nếu lưu hoặc cập nhật thất bại, giữ nguyên màn chỉnh sửa và hiển thị lỗi cạnh form.
- Không chuyển tab khi chưa có dữ liệu người dùng hợp lệ.

## Kiểm thử

- Kiểm thử hợp đồng xác nhận không còn markup/CSS drawer.
- Kiểm thử xác nhận nút chỉnh sửa gọi luồng tải dữ liệu và `switchTab` sang tab chỉnh sửa người dùng.
- Kiểm thử xác nhận nút quay lại danh sách không làm mất trạng thái lọc/phân trang.
- Giữ các kiểm thử endpoint, khóa tài khoản và chính sách mật khẩu hiện tại.
- Chạy toàn bộ kiểm thử JavaScript, backend và build Release.
