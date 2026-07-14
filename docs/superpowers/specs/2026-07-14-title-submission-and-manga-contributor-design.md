# Title Submission and Manga Contributor Design

## Mục tiêu

Hợp nhất “Create Title Draft” và “Đăng truyện mới” thành một trải nghiệm tạo truyện duy nhất. Hệ thống chỉ có hai role `User` và `Admin`: mọi người dùng đã đăng nhập được gửi truyện chờ duyệt, Admin đăng truyện trực tiếp, và người tạo bản nháp được duyệt có quyền quản lý chapter của đúng truyện đó.

## Phạm vi

Tính năng bao gồm:

- Một form tạo truyện dùng chung cho User và Admin.
- Luồng gửi, xem và duyệt Title Draft.
- Cấp quyền đóng góp theo từng truyện sau khi duyệt.
- Kiểm tra quyền khi tạo, sửa hoặc xóa chapter.
- Bộ chọn tác giả thống nhất, hỗ trợ tác giả có sẵn và đề xuất tác giả mới.
- Giao diện metadata đồng bộ với giao diện hiện tại của web.

Tính năng không bao gồm:

- Role Dịch giả hoặc quy trình xin role.
- Chuyển quyền sở hữu chapter hoặc chuyển chapter sang truyện khác.
- Cho User tự cấp quyền đóng góp cho người khác.
- Quy trình yêu cầu quyền trên một truyện do người khác tạo.

## Mô hình quyền

### User chưa đăng nhập

- Không được mở form tạo truyện.
- Không được tạo Title Draft hoặc upload chapter.
- Khi truy cập trực tiếp URL cần đăng nhập, hệ thống chuyển đến trang đăng nhập hoặc trả `401` đối với API.

### User đã đăng nhập

- Được mở form tạo truyện và gửi Title Draft.
- Chỉ được xem và sửa các draft do chính mình tạo.
- Draft ở trạng thái `Pending` không được sửa cho đến khi Admin duyệt hoặc từ chối.
- Draft bị từ chối được sửa và gửi duyệt lại.
- Draft chưa được duyệt không xuất hiện ở trang chủ, tìm kiếm, danh sách truyện hoặc trang chi tiết công khai.
- Khi draft được duyệt, User tạo draft được cấp quyền đóng góp cho Manga vừa tạo.
- Contributor được tạo, sửa và xóa chapter thuộc Manga đó; không có quyền sửa metadata của Manga và không có quyền thao tác chapter của Manga khác.

### Admin

- Dùng cùng form tạo truyện nhưng thao tác chính là `Đăng truyện`.
- Khi gửi form, Manga chính thức được tạo ngay, không cần tạo Title Draft trung gian.
- Được xem tất cả draft, duyệt hoặc từ chối draft đang chờ.
- Được quản lý mọi Manga và chapter, không phụ thuộc quyền contributor.

## Kiến trúc

### Form dùng chung

Form tạo truyện được tách thành Razor partial hoặc thành phần dùng chung để không duy trì hai bản giao diện. Một trang đóng góp công khai cho User đã đăng nhập và khu vực Admin cùng sử dụng thành phần này.

Form nhận biết role hiện tại để đổi nội dung hướng dẫn và nút hành động:

- User: `Gửi duyệt`.
- Admin: `Đăng truyện`.

Quyết định tạo draft hay Manga phải được thực hiện lại ở máy chủ dựa trên session; máy chủ không tin role hoặc trạng thái gửi từ JavaScript.

### Dịch vụ tạo truyện

Một dịch vụ ứng dụng dùng chung nhận payload tạo truyện đã chuẩn hóa và thực hiện một trong hai nhánh:

- User: tạo `TitleDraft` ở trạng thái `Pending` và ghi `CreatedByUserId`.
- Admin: tạo `Manga` cùng toàn bộ quan hệ metadata trong một transaction.

Luồng duyệt draft cũng dùng cùng logic ánh xạ metadata để kết quả không khác với Manga do Admin đăng trực tiếp.

### Quyền contributor theo từng Manga

Thêm quan hệ chuẩn hóa `MangaContributor` gồm:

- `MangaId`.
- `UserId`.
- `GrantedAt`.
- `GrantedByUserId`, là Admin đã duyệt.

Cặp `(MangaId, UserId)` là duy nhất. Khi duyệt draft, việc tạo Manga, metadata, tác giả, quyền contributor và cập nhật trạng thái draft phải nằm trong cùng transaction. Nếu một bước thất bại, không có Manga hoặc quyền dở dang được lưu.

Một dịch vụ kiểm tra quyền chapter trả về đúng khi User hiện tại là Admin hoặc tồn tại `MangaContributor` tương ứng. Tất cả endpoint tạo, sửa, xóa chapter và các view tương ứng phải dùng cùng dịch vụ này.

## Tác giả

Form dùng một bộ chọn tác giả thống nhất:

- Tìm và chọn tác giả đã có trong hệ thống.
- Nhập tên tác giả mới nếu không tìm thấy.
- Chọn vai trò `Story`, `Art`, hoặc `Story & Art` cho từng mục.
- Cho phép nhiều tác giả.
- Không cho thêm hai dòng giống nhau về tác giả và vai trò.

Tác giả mới do User nhập chỉ tồn tại trong dữ liệu draft, chưa được thêm vào bảng tác giả chính thức. Khi Admin duyệt, hệ thống so khớp tên không phân biệt hoa thường; nếu đã tồn tại thì dùng tác giả đó, nếu chưa tồn tại thì tạo mới. Manga do Admin đăng trực tiếp áp dụng cùng quy tắc.

Dữ liệu tác giả của draft được lưu theo cấu trúc riêng, không ghép chuỗi `StoryAuthor` và `Artist`, để hỗ trợ nhiều tác giả và vai trò một cách ổn định.

## Metadata và giao diện

Form duy nhất phải chứa và bảo toàn đầy đủ:

- Tiêu đề, tiêu đề thay thế và mô tả.
- Ảnh bìa và banner nếu có.
- Content Warning.
- Demographic.
- Một Format chính duy nhất.
- Genre.
- Theme.
- Trạng thái xuất bản, năm phát hành và nguồn dữ liệu cần thiết.
- Danh sách tác giả và vai trò.

Content Warning, Demographic, Format, Genre và Theme dùng cùng kiểu chip của giao diện web hiện tại. Chữ trong chip được căn giữa theo cả hai chiều; trạng thái chọn dùng màu nhấn hiện tại, riêng Content Warning được tô đỏ khi được chọn. Phần tác giả dùng cùng màu nền, border, khoảng cách, nút và trạng thái focus của form hiện tại.

Không hiển thị hai mục điều hướng `Create Title Draft` và `Đăng truyện mới` cùng lúc. User thấy mục `Đóng góp truyện`; Admin thấy mục `Đăng truyện`, nhưng cả hai mở cùng thành phần form.

## Luồng trạng thái draft

- Tạo mới: User gửi form hợp lệ và draft vào thẳng `Pending`.
- Duyệt: chỉ Admin; draft chuyển `Approved`, tạo Manga và quyền contributor.
- Từ chối: chỉ Admin; bắt buộc có lý do, draft chuyển `Rejected`.
- Gửi lại: chủ draft sửa draft `Rejected`, gửi lại và trạng thái chuyển `Pending`; lý do từ chối cũ được xóa khỏi trạng thái hiện hành nhưng vẫn có thể được giữ trong nhật ký sau này ngoài phạm vi này.
- Draft `Approved` là bất biến và liên kết đến `ApprovedMangaId`.

Không cần nút “Lưu bản nháp” trong phạm vi này. Form User gửi trực tiếp để duyệt, tránh thêm trạng thái riêng không phục vụ yêu cầu hiện tại.

## Kiểm tra dữ liệu và lỗi

- Bắt buộc tiêu đề, mô tả và ảnh bìa khi gửi hoặc đăng.
- Format chỉ nhận một giá trị.
- Các Genre, Theme và tác giả được kiểm tra tồn tại hoặc có tên đề xuất hợp lệ.
- Tên tác giả mới được trim, giới hạn độ dài và từ chối chuỗi rỗng.
- Duyệt lại một draft đã duyệt trả lỗi xung đột và không tạo Manga thứ hai.
- User truy cập draft của người khác nhận `404` để không xác nhận draft đó tồn tại.
- User không có quyền contributor khi gọi API chapter nhận `403`; giao diện cũng không hiển thị nút tương ứng.
- Thông báo lỗi và thành công dùng tiếng Việt UTF-8 hoặc Unicode escape trong JavaScript để không tái phát lỗi encoding.

## Tương thích dữ liệu hiện có

- Giữ hai role hiện tại `User` và `Admin`; không thêm role mới.
- Các Manga hiện có vẫn do Admin quản lý và không tự gán contributor.
- Các Title Draft hiện có được giữ nguyên. Migration backfill quyền contributor từ `CreatedByUserId` cho mọi draft đã duyệt có `ApprovedMangaId`, nếu quan hệ tương ứng chưa tồn tại.
- Trường tác giả chuỗi cũ trong `TitleDraft` được chuyển sang dữ liệu tác giả có cấu trúc trong migration hoặc bước backfill; dữ liệu không được mất.

## Kiểm thử và tiêu chí hoàn thành

Tính năng hoàn thành khi các kiểm thử tự động và kiểm tra giao diện xác nhận:

- User chưa đăng nhập không thể tạo draft.
- User đã đăng nhập tạo được draft `Pending`, nhưng chưa tạo Manga.
- User không xem hoặc sửa được draft của User khác.
- Admin đăng bằng cùng form và Manga xuất hiện ngay.
- Admin duyệt draft chỉ tạo đúng một Manga và cấp đúng một quyền contributor cho người tạo.
- Contributor thêm, sửa và xóa được chapter của Manga được cấp quyền.
- Contributor bị chặn với Manga khác; Admin thao tác được với mọi Manga.
- Draft chưa duyệt không xuất hiện ở các truy vấn công khai.
- Tác giả có sẵn được tái sử dụng; tác giả mới chỉ được tạo khi Admin đăng hoặc duyệt.
- Form chỉ có một Format chính và toàn bộ metadata được giữ nguyên qua quá trình duyệt.
- Nút thêm chapter chỉ xuất hiện cho Admin hoặc contributor của Manga.
- Build .NET không có lỗi hoặc cảnh báo mới, toàn bộ test backend và test JavaScript liên quan đều vượt qua.
