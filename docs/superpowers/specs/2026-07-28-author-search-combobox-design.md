# Thiết kế combobox tìm kiếm tác giả

## Mục tiêu

Thay hai ô chọn tác giả dạng `select` trong form Đăng truyện và form Chỉnh sửa chi tiết truyện bằng combobox có thể nhập để tìm kiếm. Hai form dùng chung hành vi, giao diện và dữ liệu tác giả hiện có.

## Phạm vi

- Áp dụng cho `draft-author-select` trong form Đăng truyện.
- Áp dụng cho `manga-form-author-select` trong form tạo/chỉnh sửa chi tiết truyện.
- Không thay đổi API, database hoặc cấu trúc dữ liệu tác giả.
- Form Đăng truyện vẫn giữ ô nhập tên tác giả mới.
- Cách chọn vai trò và nút `Thêm` giữ nguyên.

## Giao diện

Mỗi combobox gồm:

- Ô nhập tên tác giả.
- Giá trị ẩn chứa `authorId` đã chọn.
- Danh sách kết quả nổi bên dưới ô nhập.
- Tối đa 8 kết quả hiển thị; danh sách có thể cuộn.
- Trạng thái rỗng `Không tìm thấy tác giả`.

Dropdown dùng biến màu chung của web, đồng bộ dark/light mode và chiều rộng của form. Trên mobile, dropdown vẫn nằm ngay dưới ô nhập và không tràn khỏi khung.

## Hành vi

1. Focus vào ô nhập hiển thị tối đa 8 tác giả đầu tiên.
2. Gõ tên lọc tức thời, không phân biệt chữ hoa/thường.
3. Bấm một kết quả sẽ:
   - Điền tên tác giả vào ô nhập.
   - Ghi `authorId` vào ô ẩn.
   - Đóng dropdown.
4. Nếu người dùng sửa nội dung sau khi đã chọn, `authorId` bị xóa để tránh gửi sai tác giả.
5. Nút `Thêm` chỉ dùng tác giả hiện có khi ô ẩn chứa ID hợp lệ.
6. Trong form Đăng truyện, nếu không chọn kết quả nhưng đã nhập tên ở ô `tác giả mới`, hệ thống vẫn tạo tác giả đề xuất như hiện tại.
7. Sau khi thêm thành công, combobox được đặt lại.
8. Click bên ngoài hoặc nhấn `Escape` đóng dropdown.

## Bàn phím và truy cập

- `ArrowDown` và `ArrowUp` di chuyển kết quả đang chọn.
- `Enter` chọn kết quả đang active và không submit form.
- `Escape` đóng dropdown.
- Ô nhập dùng `role="combobox"`, `aria-expanded`, `aria-controls` và `aria-autocomplete="list"`.
- Danh sách dùng `role="listbox"`; mỗi kết quả dùng `role="option"` và `aria-selected`.

## Kiến trúc

Tạo module dùng chung `admin-author-combobox.js`.

Module cung cấp:

```js
window.AdminAuthorCombobox.create({
  inputId,
  valueId,
  listId,
  getItems,
  emptyText
});
```

Đối tượng trả về cung cấp:

```js
{
  getSelectedId(),
  getSelectedName(),
  reset(),
  refresh()
}
```

`admin.js` khởi tạo hai combobox sau khi DOM sẵn sàng. Khi danh sách tác giả tải lại hoặc đổi ngôn ngữ, `refresh()` cập nhật kết quả và thông báo rỗng.

`admin-title-drafts.js` và luồng chỉnh sửa truyện đọc ID/tên thông qua instance tương ứng, không truy cập option của `<select>`.

## Trạng thái và lỗi

- ID không tồn tại trong `authorsList` được xem như chưa chọn.
- Tên tác giả được escape trước khi render.
- Khi danh sách tác giả chưa tải xong, dropdown hiển thị trạng thái không có kết quả và tự cập nhật sau `loadAuthors()`.
- Tác giả đã thêm vẫn dùng quy tắc chống trùng hiện tại.

## Ngôn ngữ

Thêm khóa tiếng Việt và tiếng Anh:

- `admin.searchAuthorPlaceholder`
- `admin.noAuthorMatches`

Mọi nội dung động dùng `t()`; placeholder tĩnh dùng `data-i18n` và `data-i18n-attr`.

## Kiểm thử

- Kiểm thử hai form có input, hidden value và listbox, không còn hai `select` cũ.
- Kiểm thử module lọc tối đa 8 kết quả và không phân biệt hoa/thường.
- Kiểm thử thay đổi nội dung xóa ID đã chọn.
- Kiểm thử chọn bằng click và bàn phím.
- Kiểm thử Escape/click ngoài đóng dropdown.
- Kiểm thử hai luồng thêm tác giả dùng ID/tên từ combobox.
- Kiểm thử reset và refresh sau khi tải lại tác giả.
- Kiểm thử đủ khóa tiếng Việt/Anh.
- Chạy toàn bộ JavaScript tests, backend tests và build Release.
