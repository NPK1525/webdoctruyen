# Thiết kế tách trang tạo và duyệt truyện

## Mục tiêu

Tách trách nhiệm tạo truyện khỏi trách nhiệm kiểm duyệt trong Admin Control Panel. Form tạo hoặc chỉnh sửa bản nháp chỉ chứa dữ liệu nội dung. Việc xem trạng thái, duyệt và từ chối được thực hiện tại một mục quản trị riêng.

## Phạm vi

- Bỏ phần `Quản trị` khỏi menu trái và form tạo/chỉnh sửa bản nháp.
- Bỏ các trường trạng thái duyệt, người tạo, ngày tạo và lý do từ chối khỏi form.
- Bỏ các nút duyệt và từ chối khỏi form tạo/chỉnh sửa.
- Giữ nút lưu bản nháp và đăng truyện. Khi đăng, bản nháp chuyển sang trạng thái chờ duyệt.
- Thêm mục `Duyệt truyện` trong menu Admin Control Panel.
- Thêm danh sách, bộ lọc, phân trang và màn hình chi tiết duyệt trong cùng Admin Control Panel.
- Chuyển hướng URL cũ `/admin/title-drafts` về mục duyệt mới.

Không thay đổi cấu trúc cơ sở dữ liệu hoặc quy tắc tạo truyện chính thức đã có.

## Giao diện

### Form tạo và chỉnh sửa

Menu trái còn bảy phần:

1. Tiêu đề
2. Xuất bản
3. Tác giả
4. Phân loại
5. Hình ảnh
6. Liên kết
7. Dịch thuật

Thanh hành động giữ `Hủy`, `Lưu nháp` khi phù hợp và `Đăng truyện`. Form không hiển thị thông tin kiểm duyệt.

### Mục Duyệt truyện

Mục mới nằm trong menu Admin Control Panel và dùng cùng hệ màu, header, sidebar, light/dark mode và cơ chế đổi ngôn ngữ hiện tại.

Phần danh sách gồm:

- Ô tìm theo tên truyện hoặc người tạo.
- Bộ lọc trạng thái: tất cả, chờ duyệt, đã duyệt, bị từ chối.
- Bảng gồm ảnh bìa, tên truyện, người tạo, trạng thái, ngày cập nhật và hành động.
- Phân trang giống danh sách truyện và danh sách người dùng.
- Trạng thái rỗng và lỗi tải dữ liệu rõ ràng.

Menu hiển thị huy hiệu số lượng bản đang chờ duyệt. Huy hiệu được cập nhật sau khi tải dữ liệu hoặc hoàn tất thao tác duyệt.

### Chi tiết duyệt

Bấm `Xem` sẽ ẩn danh sách và mở chi tiết trong cùng vùng nội dung Admin, không chuyển sang giao diện độc lập.

Chi tiết hiển thị dữ liệu chỉ đọc theo các nhóm tương ứng với form tạo:

- Tiêu đề và mô tả.
- Thông tin xuất bản.
- Tác giả và vai trò.
- Thể loại, chủ đề và cảnh báo nội dung.
- Ảnh bìa và banner.
- Liên kết.
- Thông tin dịch thuật.
- Người tạo, ngày tạo và trạng thái hiện tại.

Cuối trang có `Quay lại danh sách`, `Từ chối` và `Duyệt truyện`.

## Luồng dữ liệu

1. Admin tạo hoặc chỉnh sửa bản nháp.
2. `Lưu nháp` giữ trạng thái nháp.
3. `Đăng truyện` gửi bản nháp sang trạng thái chờ duyệt.
4. Mục `Duyệt truyện` tải danh sách từ API quản trị hiện có.
5. Admin mở chi tiết và chọn duyệt hoặc từ chối.
6. Duyệt thành công tạo truyện chính thức theo dịch vụ hiện có.
7. Từ chối bắt buộc lý do không rỗng và lưu lý do vào bản nháp.
8. Danh sách, bộ đếm và bộ lọc được tải lại sau thao tác.

## Quy tắc và lỗi

- Chỉ admin được truy cập mục duyệt và các API duyệt.
- Không cho duyệt lại bản đã duyệt.
- Không gửi yêu cầu từ chối khi lý do trống; giao diện hiển thị thông báo dễ hiểu.
- Khi API lỗi, giữ nguyên màn hình chi tiết và nội dung lý do để admin thử lại.
- Nút hành động bị khóa trong lúc gửi để tránh gửi trùng.
- Dữ liệu đưa vào HTML phải được escape.
- URL ảnh không hợp lệ dùng ảnh thay thế hiện có.

## Tương thích

- Dùng các API danh sách, chi tiết, duyệt và từ chối hiện có; chỉ bổ sung tham số lọc hoặc phân trang nếu API chưa hỗ trợ.
- URL `/admin/title-drafts` chuyển hướng đến `/admin` với mục `Duyệt truyện` được chọn.
- Không giữ giao diện duyệt độc lập cũ.
- Tiếng Việt và tiếng Anh dùng hệ thống `i18n` hiện tại; không hard-code chuỗi hiển thị mới trong JavaScript.

## Kiểm thử

- Kiểm thử cấu trúc xác nhận form tạo không còn phần quản trị và nút duyệt/từ chối.
- Kiểm thử menu có mục duyệt và vùng danh sách/chi tiết.
- Kiểm thử đăng truyện gửi `submitForReview: true`.
- Kiểm thử tìm kiếm, lọc trạng thái và phân trang.
- Kiểm thử mở/đóng chi tiết mà không rời Admin Control Panel.
- Kiểm thử lý do từ chối bắt buộc và khóa nút khi đang gửi.
- Kiểm thử cập nhật danh sách và huy hiệu sau khi duyệt hoặc từ chối.
- Kiểm thử chuyển hướng route cũ.
- Kiểm thử khóa quyền API và quy tắc trạng thái ở backend.
- Chạy toàn bộ kiểm thử JavaScript, backend và build Release.
