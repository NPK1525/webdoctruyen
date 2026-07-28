# Thiết kế chuyển đổi ngôn ngữ toàn bộ khu vực Admin

## Mục tiêu

Toàn bộ giao diện quản trị phải chuyển đổi đầy đủ giữa tiếng Việt và tiếng Anh bằng hệ thống `I18N` hiện có. Việc đổi ngôn ngữ áp dụng ngay, không cần tải lại trang và không làm mất tab hoặc dữ liệu đang thao tác.

Chữ **Admin Control Panel** trên header dùng cùng màu cam với tab quản trị đang được chọn: `var(--accent-primary)`.

## Phạm vi

Bao gồm:

- Trang chính `/admin` và toàn bộ tab quản trị.
- Danh sách, form và thông báo của truyện, chương, bản nháp, MangaDex.
- Quản lý tác giả, thể loại, báo cáo và người dùng.
- Màn chỉnh sửa người dùng nằm trong Admin Control Panel.
- Các trang quản trị còn có route riêng: tác giả, thể loại, báo cáo và chi tiết người dùng.
- Trạng thái tải, rỗng, thành công, thất bại, hộp thoại xác nhận và phân trang.

Không dịch dữ liệu do người dùng nhập, tên truyện, tên tác giả, email, role kỹ thuật hoặc dữ liệu trả về từ API.

## Từ điển

- Thêm các khóa có tiền tố `admin.` vào `backend/wwwroot/locales/vi.json` và `backend/wwwroot/locales/en.json`.
- Hai tệp phải có cùng tập khóa.
- Tăng phiên bản cache locale trong `i18n.js`.
- Các chuỗi tĩnh dùng `data-i18n`; placeholder và title dùng `data-i18n-attr`.
- Các chuỗi sinh bằng JavaScript dùng `t('admin.key', 'fallback')`.

## Nội dung động

Mỗi module admin có hàm render lại phần nó sở hữu. Khi nhận sự kiện `manganpk:localechanged`:

- Danh sách đang hiển thị được render lại từ state hiện có.
- Nhãn trạng thái, nút hành động, tổng số và phân trang cập nhật ngay.
- Màn chỉnh sửa đang mở giữ nguyên dữ liệu form; chỉ nhãn và thông báo giao diện thay đổi.
- Không gọi lại API chỉ để đổi ngôn ngữ, trừ khi module hiện tại không lưu dữ liệu cần render.

## Giao diện

- Giữ nguyên bố cục, màu nền, light/dark mode và responsive.
- Chữ **Admin Control Panel** dùng `var(--accent-primary)` trên trang chính và các trang admin riêng.
- Không thay đổi màu dữ liệu cảnh báo, lỗi hoặc trạng thái khóa.

## Xử lý lỗi

- Nếu locale không tải được, giữ nội dung fallback hiện tại.
- Khóa thiếu ở một ngôn ngữ phải bị kiểm thử phát hiện.
- Các thông báo từ API có nội dung cụ thể vẫn được ưu tiên; fallback lỗi kết nối dùng từ điển.

## Kiểm thử

- Kiểm tra `vi.json` và `en.json` có cùng toàn bộ khóa `admin.*`.
- Kiểm tra trang `/admin` có translation hook cho các nhãn tĩnh.
- Kiểm tra module JavaScript không còn các chuỗi giao diện quản trị quan trọng viết cứng.
- Kiểm tra sự kiện đổi locale render lại danh sách người dùng, truyện, báo cáo, tác giả và thể loại.
- Kiểm tra màu **Admin Control Panel** dùng `var(--accent-primary)`.
- Chạy toàn bộ kiểm thử JavaScript, backend và build Release.
