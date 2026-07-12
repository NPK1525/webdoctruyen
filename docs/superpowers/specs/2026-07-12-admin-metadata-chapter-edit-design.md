# Thiết kế hoàn thiện metadata và sửa chapter trong admin

## Mục tiêu

Hoàn thiện admin hiện tại để quản trị viên sửa đầy đủ metadata của truyện, nhập đúng dữ liệu phân loại từ MangaDex và sửa chapter/ảnh lỗi mà không phải chuyển sang giao diện khác. Đồng thời loại bỏ thông báo mặc định sai ngữ cảnh và sửa các chuỗi tiếng Việt bị lỗi encoding trong reader.

## Phạm vi

- Mở rộng trang `/admin` và JavaScript admin hiện có.
- Giữ một `MangaFormat` chính cho mỗi truyện.
- Cho sửa chapter trong chính tab chapter, nhưng không cho chuyển chapter sang truyện khác.
- Chapter Local cho phép sửa metadata và toàn bộ danh sách trang.
- Chapter MangaDex chỉ cho sửa số chapter và tiêu đề; trang ảnh tiếp tục lấy động từ MangaDex.
- Không xây hệ thống tag Format nhiều-nhiều như MangaDex.

## Thông báo admin

Toast không chứa sẵn câu “Hoạt động thành công.” trong HTML. Nội dung toast luôn do thao tác vừa hoàn tất cung cấp. Trạng thái warning không được truyền nhầm như boolean success; toast nhận một kiểu rõ ràng gồm `success`, `error` hoặc `warning`.

## Sửa metadata truyện

Form tạo/sửa truyện giữ các trường hiện tại và bổ sung danh sách checkbox Theme tương tự Genre. Khi mở truyện để sửa, API chi tiết trả về Genres, Themes, Demographic và Format; giao diện chọn đúng toàn bộ giá trị hiện có.

Payload tạo/sửa gửi cả `genreIds` và `themeIds`. Backend kiểm tra các ID tồn tại trước khi ghi, thay thế quan hệ cũ trong cùng transaction và trả thông báo lỗi tiếng Việt cụ thể nếu dữ liệu không hợp lệ.

### Giao diện taxonomy và cảnh báo

Form admin hiển thị Content Warning, Demographic, Format, Genre và Theme bằng chip đồng bộ với biến màu dark/light mode của website. Content Warning là chip chọn nhiều và dùng màu đỏ khi được chọn. Demographic và Format là chip chọn một, còn Genre và Theme là chip chọn nhiều; các nhóm này dùng màu accent cam khi được chọn. Các control dữ liệu gốc vẫn tồn tại để giữ tương thích với payload hiện tại.

Trang chi tiết chỉ hiển thị chip Content Warning màu đỏ khi truyện có cảnh báo tương ứng. Nếu `ContentWarnings` trống thì không render chip đỏ và không tạo khoảng trống. Genre và Theme tiếp tục dùng chip trung tính.

Danh mục Genre và Theme được seed theo taxonomy MangaDex hiện tại. Khi import gặp Genre hoặc Theme chưa có, hệ thống tiếp tục tự tạo theo tên và slug, vì vậy dữ liệu mới từ MangaDex không bị bỏ qua.

## Mapping MangaDex

- `publicationDemographic` ánh xạ vào Demographic: Shounen, Shoujo, Seinen, Josei hoặc None.
- Tag group `genre` ánh xạ sang Genre.
- Tag group `theme` ánh xạ sang Theme.
- Format vẫn là một enum duy nhất. Nếu MangaDex có nhiều format tag, áp dụng ưu tiên: OneShot; WebComic/Long Strip; Adaptation; Book/Novel; Comic; nếu không khớp thì None.
- Preview import hiển thị riêng Genre, Theme, Demographic và Format để quản trị viên nhìn thấy dữ liệu sẽ được lưu.

## Danh mục phân loại

Genre seed gồm các Genre MangaDex phổ biến như Action, Adventure, Boys' Love, Comedy, Crime, Drama, Fantasy, Girls' Love, Historical, Horror, Isekai, Magical Girls, Mecha, Medical, Mystery, Philosophical, Psychological, Romance, Sci-Fi, Slice of Life, Sports, Superhero, Thriller, Tragedy và Wuxia.

Theme seed gồm Aliens, Animals, Cooking, Crossdressing, Delinquents, Demons, Genderswap, Ghosts, Gyaru, Harem, Incest, Loli, Mafia, Magic, Mahjong, Martial Arts, Military, Monster Girls, Monsters, Music, Ninja, Office Workers, Police, Post-Apocalyptic, Reincarnation, Reverse Harem, Samurai, School Life, Shota, Supernatural, Survival, Time Travel, Traditional Games, Vampires, Video Games, Villainess, Virtual Reality và Zombies.

## Sửa chapter

Tab chapter có chế độ tạo và sửa. Khi chọn một truyện, admin tải danh sách chapter và hiển thị nút sửa trên từng dòng.

Khi sửa chapter Local:

- Truyện được khóa, không thể đổi.
- Có thể sửa số chapter và tiêu đề.
- Hiển thị các trang hiện có theo thứ tự.
- Có thể kéo đổi thứ tự, xóa trang, thêm ảnh mới hoặc URL mới.
- Ảnh lỗi có nút thay thế; file mới được upload trước và chỉ thay URL sau khi upload thành công.
- Submit gửi danh sách page URL cuối cùng; backend đánh lại `PageNumber` liên tục từ 1.
- Nếu cập nhật database thất bại, dữ liệu chapter/pages cũ được giữ nguyên. File mới upload nhưng chưa được sử dụng phải được dọn hoặc ghi nhận để dọn an toàn.

Khi sửa chapter MangaDex, phần trang bị khóa và có chú thích rằng ảnh được lấy từ MangaDex@Home. Backend từ chối mọi yêu cầu thay đổi page của chapter MangaDex.

Backend chặn số chapter Local bị trùng trong cùng truyện và giữ unique constraint hiện có.

## API

- Bổ sung endpoint admin lấy chi tiết chapter gồm metadata, source và pages theo thứ tự.
- Bổ sung endpoint admin cập nhật chapter, phân nhánh Local/MangaDex theo quy tắc trên.
- API danh sách truyện/chi tiết truyện phải trả đủ Themes và các metadata cần điền lại form.
- Các endpoint tiếp tục dùng `RequireAdmin` và validate input phía server.

## Reader và encoding

Thay toàn bộ chuỗi mojibake liên quan điều hướng chapter trong Razor/JavaScript reader bằng UTF-8 hoặc HTML entity ổn định: “Chương”, “Chương trước”, “Chương tiếp theo”, “Đóng” và các nhãn điều hướng liên quan. Không thay đổi logic prev/next hiện tại nếu ID điều hướng đúng.

## Xử lý lỗi

- API trả lỗi tiếng Việt có thể hành động, không lộ chi tiết exception ra client.
- UI hiển thị ảnh lỗi bằng placeholder và cho phép thay/xóa, không làm hỏng toàn bộ danh sách preview.
- Nút lưu bị khóa khi request đang chạy và được mở lại nếu lỗi.
- Mọi thao tác cập nhật quan hệ Genre/Theme và chapter/pages dùng transaction.

## Kiểm thử

- Toast không hiển thị nội dung mặc định khi chưa có thao tác.
- Mở form sửa truyện chọn đúng Genre, Theme, Demographic và Format; lưu xong dữ liệu được giữ.
- Mapping MangaDex đúng cho Genre, Theme, Demographic và thứ tự ưu tiên Format.
- Import tự tạo tag chưa có và liên kết đúng với truyện.
- Sửa chapter Local: đổi metadata, sắp xếp, xóa, thêm và thay ảnh; PageNumber liên tục.
- Sửa chapter MangaDex từ chối thay pages.
- Cập nhật lỗi không làm mất danh sách page cũ.
- Reader hiển thị đúng chữ tiếng Việt cho điều hướng chapter.

## Tiêu chí hoàn thành

Quản trị viên có thể sửa đầy đủ phân loại truyện và sửa ảnh chapter Local ngay trong admin; import MangaDex giữ đúng metadata được hỗ trợ; reader không còn lỗi chữ; mọi lỗi cập nhật để lại dữ liệu nhất quán và thông báo rõ ràng.
