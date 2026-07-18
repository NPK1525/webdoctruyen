# Admin Title Draft Single-Page Design

## Mục tiêu

Đồng bộ trải nghiệm của form **Tạo bản nháp mới** bằng cách hiển thị toàn bộ tám nhóm thông tin trên một trang cuộn liên tục. Menu điều hướng bên trái vẫn giữ nguyên các mục và dùng để cuộn nhanh tới đúng phần thay vì ẩn/hiện từng tab.

## Phạm vi

- Áp dụng cho form tạo và chỉnh sửa bản nháp truyện trong trang admin.
- Giữ đủ tám phần: Tiêu đề, Xuất bản, Tác giả, Phân loại, Hình ảnh, Liên kết, Dịch thuật và Quản trị.
- Không thay đổi API, cấu trúc payload, quy tắc lưu nháp, đăng truyện, duyệt hoặc từ chối.
- Không thay đổi màn hình danh sách bản nháp.

## Giao diện

- Tất cả `.title-draft-section` luôn được hiển thị theo thứ tự hiện tại trong một cột.
- Mỗi phần được trình bày như một khối nội dung riêng, có khoảng cách, nền, viền và tiêu đề nhất quán với giao diện admin.
- Menu trái tiếp tục bám theo màn hình trên desktop.
- Thanh hành động Lưu nháp, Đăng truyện, Duyệt, Từ chối và Hủy tiếp tục bám phía dưới.
- Trên màn hình nhỏ, menu trở thành một hàng ngang có thể cuộn, nằm phía trên nội dung.
- Mỗi phần có khoảng bù cuộn để tiêu đề không bị header hoặc menu che khuất.

## Tương tác điều hướng

- Nhấn một mục trong menu gọi `scrollIntoView` với hiệu ứng cuộn mượt tới phần tương ứng.
- Khi người dùng tự cuộn, `IntersectionObserver` xác định phần đang nằm trong vùng đọc và cập nhật trạng thái `active` của menu.
- Nếu trình duyệt không hỗ trợ `IntersectionObserver`, thao tác nhấn menu vẫn hoạt động; mục vừa nhấn giữ trạng thái active.
- Khi mở form tạo mới hoặc mở một bản nháp để chỉnh sửa, form cuộn về phần Tiêu đề và menu đánh dấu Tiêu đề.
- Việc cuộn chỉ diễn ra bên trong trang hiện tại, không thay đổi URL và không làm mất dữ liệu đã nhập.

## Thay đổi kỹ thuật

- `backend/Views/AdminView/Index.cshtml`
  - Giữ nguyên thứ tự và `data-section-panel` của tám phần.
  - Thay CSS ẩn/hiện tab bằng bố cục các khối liên tục.
  - Bổ sung style active, scroll offset và responsive cho menu ngang.
- `backend/wwwroot/js/admin-title-drafts.js`
  - Đổi `setTitleDraftSection` từ ẩn/hiện panel sang cập nhật active và cuộn tùy chọn.
  - Gắn sự kiện menu để cuộn tới phần tương ứng.
  - Khởi tạo và dọn `IntersectionObserver` an toàn, tránh gắn trùng khi mở form nhiều lần.
  - Giữ nguyên toàn bộ logic đọc, tạo payload, lưu, đăng, duyệt và từ chối.

## Xử lý trạng thái và lỗi

- Không có dữ liệu mới cần lưu.
- Observer chỉ được khởi tạo khi form và các phần tồn tại.
- Không để lỗi điều hướng làm gián đoạn các thao tác lưu hoặc duyệt.
- Khi quay lại danh sách rồi mở form lần nữa, trạng thái active và vị trí cuộn được đặt lại về Tiêu đề.

## Kiểm thử

- Kiểm tra DOM có đủ tám phần và không phần nào dùng `display: none` để chuyển tab.
- Kiểm tra nhấn từng mục gọi cuộn tới đúng `data-section-panel`.
- Kiểm tra observer cập nhật đúng mục active khi cuộn.
- Kiểm tra mở form mới và chỉnh sửa đều bắt đầu tại Tiêu đề.
- Chạy bộ test frontend/backend hiện có liên quan đến admin.
- Kiểm tra thủ công ở desktop và mobile, cả light mode và dark mode.

## Tiêu chí hoàn thành

- Admin nhìn thấy cả tám phần trên một trang cuộn liên tục.
- Menu trái cuộn tới đúng phần và tự đánh dấu phần đang xem.
- Form dùng tốt trên màn hình nhỏ.
- Các thao tác tạo, sửa, lưu nháp, đăng, duyệt và từ chối vẫn hoạt động như trước.
