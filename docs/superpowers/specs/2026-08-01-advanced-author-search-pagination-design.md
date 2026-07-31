# Thiết kế tìm kiếm và phân trang tác giả trong tìm kiếm nâng cao

## Mục tiêu

Tối ưu bộ lọc Authors và Artists trên trang tìm kiếm nâng cao khi số lượng tác giả lớn. Trình duyệt không còn phải tải toàn bộ tác giả ngay khi mở trang. Người dùng có thể chọn một kết quả trong dropdown hoặc nhập chính xác tên rồi nhấn Enter để tìm các truyện liên quan.

## Phạm vi

- Áp dụng cho hai bộ lọc Authors và Artists trên trang tìm kiếm nâng cao.
- Không thay đổi danh sách quản lý tác giả hoặc các ô chọn tác giả trong Admin ở đợt này.
- Không thay đổi cách API manga lọc truyện: truyện vẫn được lọc bằng `authorIds` và `artistIds`.
- Giữ khả năng chọn nhiều tác giả/nghệ sĩ và khôi phục bộ lọc từ URL.

## API tìm kiếm tác giả

Thêm endpoint:

`GET /api/author/search?q={query}&role={author|artist}&page={page}&pageSize={pageSize}`

Quy tắc:

- `q` được cắt khoảng trắng và so sánh không phân biệt hoa thường.
- `role=author` nhận các liên kết có vai trò `Story` hoặc `Story & Art`.
- `role=artist` nhận các liên kết có vai trò `Art` hoặc `Story & Art`.
- `page` tối thiểu là 1.
- `pageSize` mặc định 10 và bị giới hạn tối đa 20.
- Dữ liệu được sắp xếp ưu tiên tên khớp chính xác, sau đó tên bắt đầu bằng từ khóa, cuối cùng theo thứ tự tên và ID.
- Truy vấn sử dụng projection và `AsNoTracking()`; chỉ trả các trường cần thiết.

Phản hồi:

```json
{
  "items": [
    {
      "id": 12,
      "name": "NPK",
      "roles": ["Story & Art"]
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 1,
  "totalPages": 1
}
```

Endpoint `GET /api/author` cũ được giữ nguyên để tránh làm hỏng các giao diện Admin hiện tại.

Để khôi phục các chip từ URL mà không tải toàn bộ tác giả, thêm endpoint:

`GET /api/author/lookup?ids=12,34`

Endpoint này loại bỏ ID trùng, giới hạn tối đa 20 ID và chỉ trả `id`, `name`, `roles` của các tác giả tồn tại.

## Giao diện và luồng dữ liệu

Khi người dùng nhập vào ô Authors hoặc Artists:

1. Chờ khoảng 250 ms sau lần gõ cuối cùng.
2. Hủy hoặc bỏ qua phản hồi cũ nếu từ khóa đã thay đổi.
3. Gọi API tìm kiếm với vai trò, từ khóa và trang hiện tại.
4. Hiển thị tối đa 10 kết quả cùng điều khiển trang trước/sau.
5. Khi chọn kết quả, thêm chip đã chọn và lưu ID vào trạng thái bộ lọc.

Khi nhấn Enter:

- Nếu nội dung nhập khớp chính xác một tên trong kết quả hiện tại, tự chọn kết quả đó và chạy tìm truyện.
- Nếu có nhiều bản ghi cùng tên chính xác, không tự đoán; dropdown tiếp tục mở để người dùng chọn đúng bản ghi.
- Nếu không có tên khớp chính xác, không chạy truy vấn manga bằng chuỗi tên và hiển thị trạng thái không tìm thấy phù hợp.

Khi chuyển trang dropdown:

- Giữ nguyên nội dung tìm kiếm và danh sách chip đã chọn.
- Chỉ thay danh sách gợi ý trong dropdown.
- Không tự chạy lại tìm kiếm manga cho đến khi người dùng chọn một tác giả/nghệ sĩ hoặc nhấn nút Tìm kiếm.

## Khôi phục bộ lọc từ URL

URL hiện lưu `authorIds` và `artistIds`. Khi mở một URL đã có ID:

- Frontend gọi `/api/author/lookup` với danh sách ID để lấy tên hiển thị.
- Chip tác giả/nghệ sĩ phải được khôi phục kể cả khi người đó không nằm trong trang gợi ý hiện tại.
- ID không tồn tại được bỏ qua an toàn, không làm hỏng toàn bộ trang.

## Trạng thái lỗi

- Từ khóa rỗng: không gọi API và đóng danh sách gợi ý.
- Không có kết quả: hiển thị thông báo theo ngôn ngữ hiện tại.
- Lỗi mạng hoặc lỗi server: hiển thị thông báo tải thất bại và cho phép nhập lại.
- Phản hồi đến sai thứ tự: chỉ phản hồi mới nhất được phép cập nhật dropdown.
- Nút trang trước/sau bị vô hiệu hóa ở biên.

## Ngôn ngữ và giao diện

- Tái sử dụng màu sắc, bo góc và kiểu dropdown hiện có.
- Bổ sung khóa Việt/Anh cho trạng thái đang tải, không có kết quả, tải thất bại và thông tin phân trang.
- Khi đổi ngôn ngữ, dropdown và thông tin phân trang đang mở được render lại mà không mất từ khóa hoặc tác giả đã chọn.

## Kiểm thử

### Backend

- Phân trang và giới hạn `pageSize` hoạt động đúng.
- Tìm kiếm không phân biệt hoa thường.
- `author` và `artist` lọc đúng vai trò; `Story & Art` xuất hiện ở cả hai.
- Kết quả khớp chính xác được ưu tiên.
- Truy vấn không tải toàn bộ bảng tác giả trước khi phân trang.

### Frontend

- Gõ nhanh chỉ chấp nhận phản hồi mới nhất.
- Chọn kết quả thêm đúng ID vào bộ lọc manga.
- Nhập đúng tên rồi Enter tự chọn và chạy tìm kiếm.
- Tên trùng nhau không bị tự chọn nhầm.
- Chuyển trang không mất từ khóa và chip đã chọn.
- URL có `authorIds`/`artistIds` khôi phục được tên chip.
- Đổi ngôn ngữ không làm mất trạng thái.

## Tiêu chí hoàn thành

- Trang tìm kiếm nâng cao không gọi API tải toàn bộ tác giả khi khởi tạo.
- Authors và Artists tìm kiếm qua server, có phân trang và hỗ trợ chọn nhiều mục.
- Nhập chính xác tên rồi Enter tìm được truyện của tác giả/nghệ sĩ đó.
- Bộ lọc URL cũ tiếp tục hoạt động.
- Các kiểm thử JavaScript và .NET hiện có vẫn đạt.
