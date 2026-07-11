# Thiết kế upload chapter kiểu MangaDex

## Mục tiêu

Bổ sung vào trang tạo chapter của quản trị viên một luồng chọn hoặc kéo-thả nhiều ảnh, xem trước, sắp xếp và xóa trang trước khi gửi. Chapter và toàn bộ ảnh được gửi trong một request để tránh tạo file rác khi người dùng rời form mà chưa lưu.

## Phạm vi

- Áp dụng tại `/admin/chapter/create/{mangaId}` và chỉ dành cho quản trị viên.
- Hỗ trợ ảnh JPG, JPEG, PNG, WebP và GIF.
- Giữ ô nhập URL ảnh hiện có như phương án phụ tương thích ngược.
- Không bổ sung ZIP, volume, nhóm dịch, lịch phát hành hoặc quy trình duyệt chapter.

## Trải nghiệm người dùng

Form tiếp tục có số chapter và tiêu đề. Bên dưới là vùng kéo-thả, đồng thời có nút chọn nhiều ảnh từ thiết bị.

Sau khi chọn, trình duyệt sắp ảnh theo tên file theo thứ tự tự nhiên, ví dụ `1.jpg`, `2.jpg`, `10.jpg`. Mỗi ảnh xuất hiện dưới dạng thumbnail có số trang và nút xóa. Người dùng có thể kéo thumbnail để đổi thứ tự; số trang được cập nhật ngay sau mỗi thay đổi.

Khi gửi form, nút tạo chapter bị khóa và hiển thị trạng thái đang tải. Lỗi xác thực được hiển thị ngay trên form và lựa chọn ảnh hiện tại được giữ ở phía trình duyệt khi request chưa rời trang. Khi thành công, người dùng được chuyển về trang chi tiết truyện.

## Luồng dữ liệu và kiến trúc

Form dùng `multipart/form-data` và gửi trong một request:

- `chapterNumber`
- `title`
- `pageUrls` cho luồng URL cũ
- `pageFiles` theo đúng thứ tự hiện tại trong giao diện

JavaScript quản lý một danh sách `File` duy nhất. Mỗi lần thêm ảnh, xóa hoặc kéo-thả, script dựng lại `DataTransfer` cho input file, vì vậy thứ tự multipart chính là thứ tự trang mà người dùng nhìn thấy.

Action POST `ChapterCreate` thực hiện theo thứ tự:

1. Kiểm tra truyện tồn tại và dữ liệu chapter hợp lệ.
2. Từ chối nếu cùng truyện đã có chapter local với cùng số chapter.
3. Kiểm tra số lượng, dung lượng, phần mở rộng và chữ ký nội dung của mọi ảnh trước khi ghi file.
4. Tạo chapter trong transaction cơ sở dữ liệu.
5. Lưu ảnh vào `wwwroot/uploads/manga/{mangaId}/chapters/{chapterId}/` với tên tuần tự `0001.ext`, `0002.ext`, ...
6. Tạo các bản ghi `Page` theo thứ tự file, sau đó nối thêm các URL hợp lệ từ ô URL cũ.
7. Commit transaction và chuyển về trang chi tiết truyện.

Nếu ghi file hoặc lưu cơ sở dữ liệu thất bại, transaction được rollback và thư mục chapter vừa tạo bị xóa. Các thay đổi không liên quan trong dự án không nằm trong phạm vi chỉnh sửa.

## Quy tắc xác thực

- Số chapter phải không âm.
- Chapter phải có ít nhất một ảnh upload hoặc một URL ảnh hợp lệ.
- Tối đa 500 ảnh cho một chapter.
- Mỗi ảnh tối đa 15 MB; tổng request tối đa 500 MB.
- Chỉ nhận JPG/JPEG, PNG, WebP và GIF; server kiểm tra cả phần mở rộng và magic bytes.
- Tên file từ người dùng không được dùng làm đường dẫn lưu trữ.
- URL phụ chỉ nhận địa chỉ HTTP/HTTPS tuyệt đối hoặc đường dẫn nội bộ bắt đầu bằng `/`.

## Bảo mật và xử lý lỗi

- Action tiếp tục được bảo vệ bởi `RequireAdmin` và anti-forgery token.
- Tất cả ảnh được kiểm tra trước khi tạo chapter để lỗi thường gặp không để lại dữ liệu dở dang.
- Thông báo lỗi dùng tiếng Việt, chỉ nêu lỗi có thể xử lý; chi tiết exception không trả về trình duyệt.
- Khi dọn file sau lỗi, chỉ xóa thư mục chapter đã được tạo bên trong thư mục upload đã xác định.

## Kiểm thử

Các kiểm thử trọng tâm:

- Tạo chapter thành công với nhiều ảnh và đúng thứ tự tự nhiên.
- Đổi thứ tự, xóa trang rồi submit; `PageNumber` và nội dung ảnh đúng thứ tự giao diện.
- Form URL cũ vẫn tạo được chapter.
- Từ chối chapter trùng, chapter không có trang, file quá lớn và nội dung file giả mạo phần mở rộng.
- Khi một bước lưu thất bại, không còn chapter, page hoặc thư mục ảnh dở dang.
- Người không phải quản trị viên không thể truy cập action.

## Tiêu chí hoàn thành

Quản trị viên có thể tạo một chapter hoàn chỉnh bằng cách kéo-thả nhiều ảnh, kiểm tra và chỉnh thứ tự trước khi tải; trình đọc hiển thị các trang đúng thứ tự; dữ liệu và file không bị bỏ lại khi thao tác thất bại.
