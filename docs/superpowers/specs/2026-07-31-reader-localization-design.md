# Đồng bộ ngôn ngữ sidebar trang đọc và báo cáo

## Mục tiêu

Toàn bộ trải nghiệm mở từ sidebar bên phải của trang đọc phải chuyển đổi tức thời giữa tiếng Việt và tiếng Anh theo hệ thống `I18N` chung của website, không cần tải lại trang.

## Phạm vi

Bao gồm:

- Menu sidebar bên phải của trang đọc.
- Nhãn Trang, Chương và các danh sách lựa chọn động.
- Nút báo cáo chương.
- Các trạng thái kiểu đọc, co ảnh, hướng đọc, header và thanh tiến trình.
- Toàn bộ modal Reader Settings.
- Modal báo cáo dùng chung ở trang đọc và chi tiết truyện.
- Danh sách lý do báo cáo truyện và chương.
- Thông báo validation, lỗi gửi và thành công của báo cáo.
- `title`, `aria-label` liên quan trong các thành phần trên.

Không bao gồm:

- Thay đổi API báo cáo.
- Thay đổi route, DTO hoặc database.
- Dịch tên truyện, tên chương hoặc nội dung do người dùng nhập.
- Thay đổi bố cục hay màu sắc giao diện.

## Kiến trúc

### Nguồn bản dịch

Mọi chuỗi giao diện mới được thêm vào:

- `backend/wwwroot/locales/vi.json`
- `backend/wwwroot/locales/en.json`

Không tạo từ điển riêng trong `reader.js`, `reader-settings.js` hoặc `report-modal.js`.

### Nội dung tĩnh

Các phần tử có nội dung cố định trong `Read.cshtml` và `_ReportModal.cshtml` sử dụng:

- `data-i18n` cho text.
- `data-i18n-attr="title"` hoặc `data-i18n-attr="aria-label"` cho thuộc tính hỗ trợ.

`I18N.apply()` tiếp tục là cơ chế cập nhật chung.

### Nội dung động

`reader.js`, `reader-settings.js` và `report-modal.js` dùng hàm `t(key, fallback)` khi tạo:

- Nhãn trang/chương.
- Option trang/chương.
- Trạng thái cài đặt đang chọn.
- Danh sách phím tắt.
- Danh sách lý do báo cáo.
- Thông báo validation, lỗi và thành công.

Các module có nội dung động lắng nghe sự kiện:

```text
manganpk:localechanged
```

Khi sự kiện xảy ra, chúng chỉ render lại text cần thiết và giữ nguyên:

- Trang hiện tại.
- Chương hiện tại.
- Trạng thái đóng/mở sidebar và modal.
- Cài đặt đọc.
- Lý do báo cáo đã chọn và nội dung giải thích đã nhập.

## Báo cáo và tính tương thích

Lý do báo cáo có hai giá trị tách biệt:

- `value`: chuỗi chuẩn hiện tại gửi về backend, giữ nguyên bằng tiếng Anh.
- Label: chuỗi đã dịch hiển thị cho người dùng.

Ví dụ:

```html
<option value="Images not loading">Ảnh không tải được</option>
```

Nhờ đó báo cáo cũ, bộ lọc admin và validation backend không bị thay đổi.

Modal báo cáo là partial dùng chung, vì vậy bản dịch phải hoạt động giống nhau ở:

- Trang chi tiết truyện.
- Trang đọc chương.

## Xử lý lỗi

- Nếu thiếu khóa dịch, `t(key, fallback)` hiển thị fallback hiện có.
- Đổi ngôn ngữ không đóng modal hoặc xóa dữ liệu form.
- Lỗi API vẫn ưu tiên message từ server; các message mặc định phía client được dịch.
- Không dịch dữ liệu tự do do server hoặc người dùng cung cấp.

## Kiểm thử

Thêm JavaScript contract tests xác nhận:

1. `vi.json` và `en.json` có cùng toàn bộ khóa reader/report mới.
2. Sidebar và Reader Settings không còn nhãn tiếng Anh hard-code không có translation hook.
3. Modal báo cáo có translation hook cho tiêu đề, label, placeholder và nút.
4. Lý do báo cáo giữ nguyên value gửi backend nhưng label thay đổi theo locale.
5. Ba module động phản ứng với `manganpk:localechanged`.
6. Đổi ngôn ngữ giữ nguyên lựa chọn và dữ liệu người dùng trong modal báo cáo.
7. Các contract test reader và report hiện có tiếp tục đạt.

## Tiêu chí hoàn thành

- Chuyển Việt/Anh cập nhật ngay toàn bộ sidebar, Reader Settings và modal báo cáo.
- Không cần reload trang.
- Không thay đổi payload báo cáo.
- Không làm mất trạng thái đọc hoặc nội dung form.
- Toàn bộ backend tests, JavaScript tests và Release build đạt.
