# Title Draft Action Bar Design

## Mục tiêu

Đồng bộ khu vực nút hành động cuối form tạo truyện với giao diện quản trị hiện tại, loại bỏ mảng nền đen tách biệt đang làm footer trông như một khối lồng sai màu.

## Thiết kế đã chọn

- Thanh hành động dùng nền trong suốt để kế thừa trực tiếp nền của form.
- Giữ đường viền mảnh phía trên nhằm phân tách nội dung và nhóm nút.
- Giữ các nút căn phải, khoảng cách hiện tại và khả năng xuống dòng trên màn hình nhỏ.
- Giữ trạng thái sticky ở cuối khung cuộn để các nút luôn dễ truy cập.
- Không thay đổi màu, icon, nội dung dịch thuật hoặc hành vi của nút Hủy và Đăng truyện.

## Phạm vi kỹ thuật

Chỉ điều chỉnh quy tắc CSS `.title-draft-actions` trong trang quản trị. Không thay đổi API, JavaScript hay dữ liệu.

## Kiểm tra

- Thanh nút không còn mảng nền đen khác màu.
- Nút vẫn căn phải và không tràn trên màn hình nhỏ.
- Giao diện hoạt động ở cả dark mode và light mode.
- Các kiểm thử giao diện và build hiện có vẫn đạt.
