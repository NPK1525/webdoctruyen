# Thiết kế chỉnh sửa tài khoản người dùng

## Mục tiêu

Trang chi tiết người dùng của admin hỗ trợ quản lý hồ sơ, avatar HTTPS và đặt lại mật khẩu. Người dùng thường không thể thay đổi email của chính mình.

## Phạm vi

### Avatar

- Chỉ chấp nhận URL tuyệt đối bắt đầu bằng `https://`.
- Giới hạn tối đa 2.048 ký tự.
- Từ chối `http://`, đường dẫn tương đối, `data:image/...`, JavaScript URL và chuỗi rỗng không hợp lệ.
- Admin có thể xóa avatar bằng cách để trống trường avatar.
- Giao diện admin bỏ giới hạn 500 ký tự và dùng `maxlength="2048"`.
- Ảnh xem trước lỗi sẽ quay về ảnh mặc định.

### Đặt lại mật khẩu bởi admin

- Thêm endpoint quản trị riêng: `PUT /api/admin/users/{id}/password`.
- Payload gồm `newPassword` và `confirmPassword`.
- Không yêu cầu mật khẩu hiện tại của người dùng.
- Chỉ admin đã xác thực mới gọi được endpoint.
- Mật khẩu mới phải dài tối thiểu 8 ký tự, có chữ và số, giống quy tắc đăng ký.
- Hai trường mật khẩu phải trùng nhau.
- Không trả về hoặc ghi log mật khẩu hay `PasswordHash`.
- Trang chi tiết người dùng có khối “Đặt lại mật khẩu” riêng với nút riêng; lưu hồ sơ không tác động đến mật khẩu.

### Email của người dùng

- Email vẫn hiển thị trong hồ sơ ở trạng thái chỉ đọc.
- Form hồ sơ của user không gửi email trong payload cập nhật.
- API `PUT /api/userprofile/me` bỏ qua hoặc từ chối mọi giá trị email được gửi lên; lựa chọn thiết kế là từ chối bằng `400 Bad Request` để phát hiện client cũ hoặc yêu cầu trái phép.
- Admin vẫn được sửa email trong trang chi tiết người dùng và tiếp tục kiểm tra định dạng, chuẩn hóa, chống trùng.

## Luồng dữ liệu

1. Admin tải trang chi tiết và nhận dữ liệu người dùng không chứa mật khẩu.
2. Khi lưu hồ sơ, client gửi username, email, role, avatar HTTPS, badge và bio tới endpoint hồ sơ admin hiện có.
3. Khi đặt lại mật khẩu, client gửi riêng hai trường mật khẩu tới endpoint password mới.
4. Backend xác thực quyền admin, kiểm tra dữ liệu, băm mật khẩu bằng `AuthService.HashPassword` rồi mới lưu.
5. User tự cập nhật hồ sơ chỉ gửi avatar, badge và bio; email trong database không thay đổi.

## Xử lý lỗi

- Avatar không phải HTTPS: “Ảnh đại diện phải là URL HTTPS hợp lệ.”
- Avatar dài quá 2.048 ký tự: “URL ảnh đại diện không được vượt quá 2.048 ký tự.”
- Mật khẩu không đạt yêu cầu: trả thông báo quy tắc hiện tại.
- Xác nhận mật khẩu không khớp: trả `400 Bad Request`.
- Không tìm thấy người dùng: trả `404 Not Found`.
- Trùng email khi admin chỉnh sửa: trả `409 Conflict`.
- Giao diện giữ nguyên dữ liệu form và hiển thị thông báo lỗi, không tải lại trang.

## Kiểm thử

- API admin chấp nhận URL HTTPS dài hơn 500 nhưng không quá 2.048 ký tự.
- API admin từ chối HTTP, base64 và URL quá dài.
- Admin đặt lại được mật khẩu không cần mật khẩu cũ; mật khẩu mới đăng nhập được và mật khẩu cũ không còn hợp lệ.
- Endpoint đặt lại mật khẩu kiểm tra xác nhận và độ mạnh.
- User không thể đổi email ngay cả khi tự gọi API với payload có email.
- Form user không còn cho sửa hoặc gửi email.
- Form admin có khối đặt lại mật khẩu riêng và avatar giới hạn 2.048 ký tự.

## Ngoài phạm vi

- Gửi email thông báo khi admin đặt lại mật khẩu.
- Bắt buộc đổi mật khẩu ở lần đăng nhập tiếp theo.
- Thu hồi tức thời mọi phiên đăng nhập đang tồn tại.
- Lưu file avatar hoặc chuyển đổi dữ liệu base64 cũ thành file.
