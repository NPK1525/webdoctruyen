# Admin Manga Filter and Pagination Design

## Mục tiêu

Bổ sung tìm kiếm, lọc, sắp xếp và phân trang cho bảng quản lý truyện trong Admin. Mặc định hiển thị 20 truyện mỗi trang và xử lý truy vấn tại máy chủ.

## Phạm vi

- Tìm theo tên truyện, tên thay thế hoặc tác giả.
- Lọc theo loại truyện, trạng thái, nguồn dữ liệu và tình trạng chapter.
- Sắp xếp theo mới nhất, cũ nhất, tên A–Z hoặc số chapter.
- Chọn kích thước trang 20, 50 hoặc 100; mặc định 20.
- Hiển thị tổng số kết quả, điều hướng trang và trạng thái tải/rỗng/lỗi.

Không thay đổi quyền Admin, API chỉnh sửa truyện, API chapter hoặc giao diện ngoài màn hình quản lý truyện.

## API

Endpoint danh sách Admin nhận các query:

`GET /api/admin/manga?page=1&pageSize=20&search=&type=&status=&source=&chapterState=&sort=`

- `page` tối thiểu là 1.
- `pageSize` chỉ nhận 20, 50 hoặc 100; giá trị khác chuyển về 20.
- `search` được trim, tìm không phân biệt hoa thường trên `Title`, `AlternativeTitle` và tên tác giả.
- `type` nhận enum MangaType.
- `status` nhận enum MangaStatus.
- `source` nhận `Local` hoặc `MangaDex`.
- `chapterState` nhận `with-chapters` hoặc `without-chapters`.
- `sort` nhận `newest`, `oldest`, `title-asc` hoặc `chapter-count`.

Response giữ cấu trúc phân trang hiện tại và bổ sung/duy trì:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

Truy vấn phải lọc trước, đếm tổng sau lọc, sắp xếp ổn định, rồi mới `Skip/Take`. Tên tác giả dùng `Any` trên quan hệ MangaAuthors để không tạo bản ghi trùng khi join.

## Giao diện

Phía trên bảng `Danh sách truyện` có một thanh điều khiển đồng bộ giao diện Admin hiện tại:

- Ô tìm kiếm có debounce ngắn và nút xóa.
- Select Loại, Trạng thái, Nguồn, tình trạng chapter và sắp xếp.
- Select kích thước trang với 20 được chọn mặc định.
- Nút `Đặt lại` xóa toàn bộ điều kiện và tải lại trang 1.

Bên dưới bảng có tổng số kết quả và phân trang. Khi search, đổi filter, sort hoặc page size, trang được đặt về 1. Khi sửa/xóa truyện, giữ nguyên query hiện tại và tải lại; nếu trang cuối bị rỗng thì lùi về trang hợp lệ cuối cùng.

Các trạng thái bắt buộc:

- Loading: khóa điều khiển trong lúc tải và hiển thị dòng đang tải.
- Empty: hiển thị “Không tìm thấy truyện phù hợp” cùng nút đặt lại.
- Error: dùng toast hiện tại, không hiển thị dữ liệu cũ như thể là kết quả mới.

## Kiểm thử

- API mặc định trả page 1, pageSize 20.
- `pageSize` không hợp lệ được chuẩn hóa về 20.
- Search khớp tiêu đề, tên thay thế và tác giả.
- Mỗi bộ lọc hoạt động độc lập và kết hợp được.
- `without-chapters` không trả truyện có chapter.
- Tổng số và tổng số trang phản ánh đúng sau lọc.
- Sắp xếp ổn định và phân trang không trùng/thiếu bản ghi.
- Giao diện reset về trang 1 khi đổi filter và hiển thị đúng trạng thái loading/empty/error.
- Build .NET không lỗi/cảnh báo mới; test JavaScript quản lý danh sách đạt.

