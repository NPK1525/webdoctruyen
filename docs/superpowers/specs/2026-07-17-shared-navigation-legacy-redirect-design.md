# Shared Navigation and Legacy Redirect Design

## Mục tiêu

Khôi phục tính nhất quán của giao diện sau clean code mà không viết lại trang Hồ sơ hoặc MDList.

## Phạm vi được duyệt

- Giữ nguyên nội dung và chức năng hiện tại của `profile.html` và `lists.html`.
- Hai trang này phải dùng chung header/sidebar mới do `common.js` quản lý; không tiếp tục hiển thị sidebar legacy riêng.
- Xóa chuông thông báo và dropdown thông báo khỏi header dùng chung.
- Xóa các mục tài khoản `Báo cáo` và `Gói đăng ký` vì chưa có chức năng.
- Mục `Cài đặt` điều hướng tới `/profile.html`.
- Sidebar `MDLists` điều hướng tới `/lists.html`.
- `index.html` chuyển hướng tới `/`.
- `detail.html` chuyển hướng tới route MVC `/manga/{id}` khi có ID hợp lệ; nếu thiếu ID thì tới `/manga`.
- `reader.html` chuyển hướng tới route MVC `/chapter/{id}` khi có ID hợp lệ; nếu thiếu ID thì tới `/`.
- Đồng bộ cache-buster của `common.js` trên các trang sử dụng để trình duyệt nhận bản giao diện mới.

## Thiết kế

### Header và menu tài khoản

`renderHeaderUserArea()` chỉ dựng avatar, các liên kết đang hoạt động và nút đăng xuất. Phần chuông/dropdown thông báo bị loại bỏ hoàn toàn khỏi markup dùng chung. `Báo cáo` và `Gói đăng ký` không còn xuất hiện. `Cài đặt` là liên kết thật tới `/profile.html`.

### Sidebar dùng chung

`renderUnifiedSidebarDrawer()` tiếp tục bảo toàn sidebar Razor hiện tại. Riêng các trang tĩnh được đánh dấu dùng sidebar chung sẽ cho phép hàm thay thế sidebar legacy bằng cùng markup đang dùng trên toàn website. `profile.html` và `lists.html` mang dấu hiệu này, nên không cần sao chép thêm một bản sidebar mới.

### Chuyển hướng giao diện legacy

Ứng dụng chặn ba URL legacy trước bước phục vụ static files:

- `/index.html` -> `/`
- `/detail.html?mangaId=123` -> `/manga/123`
- `/reader.html?chapterId=456` -> `/chapter/456`

ID không hợp lệ không được ghép vào URL. Các query string không cần thiết không được truyền tiếp.

### Cache

Tất cả consumer của `common.js` dùng cùng phiên bản query mới. Việc này chỉ bust cache, không đổi API hoặc cấu trúc dữ liệu.

## Xử lý lỗi và giới hạn

- Không xóa backend notification trong đợt này; chỉ bỏ giao diện chuông theo yêu cầu.
- Không migrate Hồ sơ hoặc MDList sang Razor/MVC trong đợt này.
- Không thêm trang Báo cáo, Gói đăng ký hoặc Cài đặt mới.
- Không thay đổi bố cục nội dung chính của Hồ sơ và MDList.

## Kiểm thử

- Contract test xác nhận header không còn notification, Báo cáo và Gói đăng ký.
- Contract test xác nhận Cài đặt, Hồ sơ, MDList có URL chính xác.
- Contract test xác nhận Hồ sơ/MDList opt-in sidebar chung và không dùng cache-buster cũ.
- Integration/source contract xác nhận middleware redirect ba trang legacy và xử lý ID hợp lệ/không hợp lệ.
- Chạy toàn bộ JavaScript tests, .NET tests và Release build.

## Tiêu chí hoàn thành

- Không còn đường điều hướng chủ động nào đưa người dùng vào giao diện legacy.
- Hồ sơ và MDList hiển thị cùng header/sidebar với trang MVC hiện tại.
- Menu tài khoản không chứa chức năng giả hoặc chuông thông báo.
- Các route đang hoạt động trước đây tiếp tục build và test thành công.
