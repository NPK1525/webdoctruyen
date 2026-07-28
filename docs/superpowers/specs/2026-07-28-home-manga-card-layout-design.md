# Thiết kế thẻ truyện trang chủ

## Mục tiêu

Các thẻ truyện trong băng chuyền trang chủ có ảnh bìa đồng đều, không bị cao thấp khác nhau khi tên truyện dài.

## Giao diện

- Khung bo góc và nền thẻ chỉ bao quanh ảnh bìa.
- Nhãn loại truyện tiếp tục nằm trên ảnh.
- Tên truyện nằm bên dưới khung ảnh, không có nền hoặc viền bao quanh.
- Vùng tên có chiều cao cố định tương đương hai dòng.
- Tên dài hơn hai dòng được rút gọn bằng dấu ba chấm.
- Không thêm tooltip hoặc hành vi hiển thị tên đầy đủ khi rê chuột.
- Nhấn vào ảnh hoặc tên đều mở trang chi tiết truyện.

## Phạm vi

Chỉ thay đổi thẻ truyện trong băng chuyền gợi ý trên trang chủ. Không thay đổi thẻ ở trang danh sách, thư viện hoặc phần gợi ý trong chi tiết truyện.

## Kiểm thử

Thêm kiểm tra hợp đồng giao diện xác nhận khung ảnh và tiêu đề là hai phần ngang cấp, ảnh giữ tỉ lệ `2/3`, tiêu đề giới hạn hai dòng và vùng tên có chiều cao cố định.
