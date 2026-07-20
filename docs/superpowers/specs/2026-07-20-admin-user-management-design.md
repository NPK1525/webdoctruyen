# Thiết kế quản lý người dùng trong trang admin

## Mục tiêu

Bổ sung chức năng quản lý người dùng trực tiếp trong trang admin hiện tại, giữ nguyên ngôn ngữ thiết kế, cách chuyển tab và phản hồi thao tác đang dùng cho quản lý truyện, tác giả, thể loại và báo cáo.

Admin có thể xem, tìm kiếm, lọc, phân trang, đổi vai trò và khóa hoặc mở khóa tài khoản. Hệ thống không xóa vĩnh viễn tài khoản để tránh làm hỏng dữ liệu liên kết như bình luận, báo cáo, thư viện, danh sách và đóng góp truyện.

## Phạm vi giao diện

- Thêm một nút `Quản lý người dùng` vào menu trái của `/admin`.
- Nội dung mở trong một `admin-tab-pane` của cùng trang, không điều hướng sang một giao diện riêng.
- Chỉ tab đang được chọn có trạng thái active.
- Thanh công cụ gồm:
  - ô tìm kiếm theo tên đăng nhập hoặc email;
  - bộ lọc vai trò: tất cả, User, Admin;
  - bộ lọc trạng thái: tất cả, hoạt động, đã khóa;
  - nút đặt lại bộ lọc.
- Bảng người dùng gồm avatar, tên đăng nhập, email, vai trò, trạng thái, ngày tạo và thao tác.
- Phân trang phía server với 20 người dùng mỗi trang. Tìm kiếm được debounce để tránh gửi yêu cầu ở mỗi lần gõ phím.
- Các trạng thái tải, rỗng và lỗi dùng cùng card, màu, nút, toast và biến theme của trang admin hiện tại; hỗ trợ light/dark mode thông qua các biến CSS dùng chung.
- Nội dung động dùng tiếng Việt nhất quán với trang admin hiện tại.

## Dữ liệu

Thêm trường `IsLocked` kiểu boolean vào `User`, mặc định `false`. Tạo migration cập nhật bảng `Users` và snapshot Entity Framework.

Không đưa `PasswordHash` vào bất kỳ DTO hoặc phản hồi API quản trị nào.

Mỗi phần tử danh sách trả về:

- `id`
- `username`
- `email`
- `role`
- `avatarUrl`
- `isLocked`
- `createdAt`

## API quản trị

Tạo controller quản lý người dùng dưới `/api/admin/users`, được bảo vệ bằng `[RequireAdmin]`.

### Lấy danh sách

`GET /api/admin/users?page=1&pageSize=20&search=&role=&status=`

- `search` tìm không phân biệt hoa thường trong username và email.
- `role` chỉ chấp nhận `User` hoặc `Admin` khi có giá trị.
- `status` chỉ chấp nhận `active` hoặc `locked` khi có giá trị.
- `page` tối thiểu là 1; `pageSize` được giới hạn tối đa 100.
- Sắp xếp mặc định theo ngày tạo mới nhất, sau đó theo id giảm dần.
- Phản hồi gồm `items`, `page`, `pageSize`, `totalItems`, `totalPages`.

### Đổi vai trò

`PUT /api/admin/users/{id}/role`

Body: `{ "role": "User" | "Admin" }`

- Trả 404 nếu không tìm thấy tài khoản.
- Từ chối vai trò không hợp lệ.
- Admin hiện tại không thể tự hạ quyền.
- Không thể hạ quyền quản trị viên hoạt động cuối cùng.
- Thao tác giữ nguyên trạng thái khóa của tài khoản.

### Khóa hoặc mở khóa

`PUT /api/admin/users/{id}/lock`

Body: `{ "isLocked": true | false }`

- Trả 404 nếu không tìm thấy tài khoản.
- Admin hiện tại không thể tự khóa.
- Không thể khóa quản trị viên hoạt động cuối cùng.
- Mở khóa không thay đổi vai trò.

Các thao tác cập nhật trả về DTO người dùng đã cập nhật để giao diện đồng bộ dòng tương ứng mà không cần đoán trạng thái.

## Quy tắc bảo vệ tài khoản

`Admin hoạt động` là tài khoản có `Role == "Admin"` và `IsLocked == false`.

- Không cho phép thao tác làm số admin hoạt động giảm xuống 0.
- Không cho tài khoản đang đăng nhập tự hạ quyền hoặc tự khóa.
- Không thêm chức năng xóa tài khoản.
- Mọi kiểm tra quyền được thực hiện ở server; giao diện chỉ ẩn hoặc khóa nút để cải thiện trải nghiệm, không được xem là lớp bảo mật.

## Xác thực và phiên đăng nhập

- Đăng nhập trả 403 với thông báo phù hợp nếu mật khẩu đúng nhưng tài khoản đang bị khóa.
- `GET /api/auth/me` kiểm tra `IsLocked`. Tài khoản không tồn tại trả 401; tài khoản bị khóa xóa session và trả 403 để client xóa trạng thái đăng nhập cục bộ.
- Việc khóa tài khoản không cần theo dõi và xóa trực tiếp toàn bộ session phía server; phiên bị vô hiệu hóa ở yêu cầu xác thực hoặc yêu cầu quản trị kế tiếp.
- `RequireAdmin` không chỉ tin vai trò đã lưu trong session. Với yêu cầu admin, filter kiểm tra lại người dùng trong cơ sở dữ liệu còn tồn tại, chưa khóa và vẫn có vai trò `Admin`; nếu không hợp lệ thì xóa session và từ chối yêu cầu.

## Luồng giao diện

1. Khi trang admin tải, dữ liệu người dùng chỉ được tải khi tab quản lý người dùng được mở lần đầu.
2. Thay đổi tìm kiếm hoặc bộ lọc đưa trang về 1 và tải lại danh sách.
3. Khi đổi vai trò hoặc trạng thái khóa, giao diện yêu cầu xác nhận trước với thao tác nhạy cảm.
4. Thành công: cập nhật danh sách và hiển thị toast.
5. Lỗi 400/403/404/409: giữ nguyên trạng thái dòng và hiển thị thông báo từ API.
6. Trong lúc yêu cầu đang chạy, nút thao tác của dòng bị vô hiệu hóa để tránh gửi lặp.

## Cấu trúc mã

- `Models/User.cs`: thêm trạng thái khóa.
- Migration và snapshot: cập nhật schema.
- Controller API quản lý người dùng riêng: truy vấn phân trang và thao tác quản trị.
- `Views/AdminView/Index.cshtml`: thêm tab, bộ lọc, bảng và phân trang.
- JavaScript quản lý người dùng tách riêng khỏi `admin.js`, sau đó được nạp trước coordinator để giữ trách nhiệm rõ ràng.
- `style.css`: chỉ thêm class dùng biến theme hiện có, tránh màu nền Bootstrap hoặc palette riêng.

## Xử lý lỗi và cạnh tranh

- Server luôn kiểm tra lại người dùng mục tiêu và quy tắc admin cuối cùng tại thời điểm cập nhật.
- Thao tác có thể làm giảm số admin hoạt động chạy trong transaction mức `Serializable`, đếm lại admin hoạt động bên trong transaction trước khi lưu để hai yêu cầu đồng thời không thể làm số admin hoạt động giảm xuống 0.
- Các lỗi cập nhật được trả về dưới dạng JSON có `message`.
- Dữ liệu đầu vào được trim và chuẩn hóa trước khi so sánh.
- Không trả stack trace hoặc dữ liệu nhạy cảm cho client.

## Kiểm thử

### Backend

- Chỉ admin truy cập được danh sách và endpoint cập nhật.
- Danh sách phân trang, tìm kiếm và lọc đúng.
- DTO không chứa `PasswordHash`.
- Đổi vai trò hợp lệ hoạt động; vai trò lạ bị từ chối.
- Không thể tự hạ quyền hoặc tự khóa.
- Không thể khóa/hạ quyền admin hoạt động cuối cùng.
- Khóa tài khoản ngăn đăng nhập.
- `/api/auth/me` vô hiệu hóa phiên của tài khoản bị khóa.

### Frontend contract

- Tab và pane người dùng nằm trong trang admin chung.
- Module người dùng tải trước `admin.js`.
- Giao diện gọi API phân trang phía server với page size 20.
- Tìm kiếm, lọc, phân trang và các thao tác role/lock được nối đúng endpoint.
- CSS sử dụng biến theme chung và có bố cục responsive cho màn hình nhỏ.

### Hồi quy

- Chạy toàn bộ JavaScript contract tests.
- Build backend không cảnh báo/lỗi.
- Chạy test backend liên quan controller, xác thực và kiến trúc admin.

## Ngoài phạm vi

- Xóa tài khoản vĩnh viễn.
- Đặt lại mật khẩu hoặc gửi email.
- Nhật ký kiểm toán riêng cho thao tác quản trị.
- Phân quyền chi tiết ngoài hai vai trò `User` và `Admin`.
- Khóa theo thời hạn hoặc tự động mở khóa.
