# MangaNPK

## Cấu hình email đặt lại mật khẩu

Luồng **Quên mật khẩu** gửi OTP 6 chữ số qua SMTP. Không ghi mật khẩu email vào `appsettings.json` hoặc Git. Cấu hình bằng biến môi trường trước khi chạy backend:

```powershell
$env:Smtp__Host = "smtp.example.com"
$env:Smtp__Port = "587"
$env:Smtp__EnableSsl = "true"
$env:Smtp__Username = "no-reply@example.com"
$env:Smtp__Password = "<SMTP_PASSWORD>"
$env:Smtp__FromAddress = "no-reply@example.com"
$env:Smtp__FromName = "MangaNPK"
```

Với Gmail, hãy bật xác minh hai bước và dùng **app password** thay cho mật khẩu đăng nhập tài khoản. Khi chưa cấu hình SMTP, hệ thống không gửi OTP và trả về lỗi tạm thời cho tài khoản hợp lệ; không có mã OTP nào được ghi vào log.

Các giá trị biến môi trường chỉ tồn tại trong phiên terminal hiện tại. Khi triển khai thật, dùng secret manager hoặc cấu hình bảo mật của máy chủ.
