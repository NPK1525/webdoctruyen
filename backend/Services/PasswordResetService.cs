using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services.Email;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public sealed record PasswordResetResult(
    bool Succeeded,
    string Message,
    string? ResetToken = null,
    bool DeliveryUnavailable = false);

public sealed class PasswordResetService(
    MangaDbContext context,
    IEmailSender emailSender,
    TimeProvider timeProvider)
{
    private const int MaximumAttempts = 5;
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);
    private const string GenericRequestMessage = "Nếu email tồn tại, mã OTP đã được gửi.";
    private const string InvalidOtpMessage = "Mã OTP không hợp lệ hoặc đã hết hạn.";

    public async Task<PasswordResetResult> RequestOtpAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        var user = await context.Users
            .FirstOrDefaultAsync(candidate => candidate.Email.ToLower() == normalizedEmail, cancellationToken);

        if (user is null || user.IsLocked)
            return new(true, GenericRequestMessage);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var latest = await context.PasswordResetRequests
            .Where(request => request.UserId == user.Id && request.ConsumedAt == null)
            .OrderByDescending(request => request.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (latest is not null && now - latest.LastSentAt < ResendCooldown)
            return new(true, GenericRequestMessage);

        if (latest is not null)
            latest.ConsumedAt = now;

        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var request = new PasswordResetRequest
        {
            UserId = user.Id,
            OtpHash = Hash(otp),
            CreatedAt = now,
            LastSentAt = now,
            ExpiresAt = now.Add(OtpLifetime)
        };
        context.PasswordResetRequests.Add(request);
        await context.SaveChangesAsync(cancellationToken);

        try
        {
            await emailSender.SendAsync(new EmailMessage(
                user.Email,
                "Mã OTP đặt lại mật khẩu MangaNPK",
                BuildOtpEmail(otp)), cancellationToken);
        }
        catch (Exception exception) when (exception is InvalidOperationException or SmtpException)
        {
            request.ConsumedAt = now;
            await context.SaveChangesAsync(cancellationToken);
            return new(false, "Hiện chưa thể gửi email. Vui lòng thử lại sau.", DeliveryUnavailable: true);
        }

        return new(true, GenericRequestMessage);
    }

    public async Task<PasswordResetResult> VerifyOtpAsync(
        string email,
        string otp,
        CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(email, cancellationToken);
        if (user is null || user.IsLocked)
            return new(false, InvalidOtpMessage);

        var request = await FindLatestActiveRequestAsync(user.Id, cancellationToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;
        if (request is null || request.FailedAttempts >= MaximumAttempts)
            return new(false, InvalidOtpMessage);

        if (request.ExpiresAt <= now)
        {
            request.ConsumedAt = now;
            await context.SaveChangesAsync(cancellationToken);
            return new(false, InvalidOtpMessage);
        }

        if (!FixedTimeMatches(otp?.Trim() ?? string.Empty, request.OtpHash))
        {
            request.FailedAttempts++;
            if (request.FailedAttempts >= MaximumAttempts)
                request.ConsumedAt = now;
            await context.SaveChangesAsync(cancellationToken);
            return new(false, InvalidOtpMessage);
        }

        var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        request.VerifiedAt = now;
        request.ResetTokenHash = Hash(resetToken);
        request.ResetTokenExpiresAt = now.Add(ResetTokenLifetime);
        await context.SaveChangesAsync(cancellationToken);

        return new(true, "Mã OTP hợp lệ.", resetToken);
    }

    public async Task<PasswordResetResult> ResetPasswordAsync(
        string email,
        string resetToken,
        string password,
        string confirmPassword,
        CancellationToken cancellationToken = default)
    {
        if (password != confirmPassword)
            return new(false, "Mật khẩu xác nhận không khớp.");

        if (!AuthService.IsValidPassword(password))
            return new(false, "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.");

        var user = await FindUserAsync(email, cancellationToken);
        if (user is null || user.IsLocked)
            return new(false, "Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");

        var request = await FindLatestActiveRequestAsync(user.Id, cancellationToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;
        if (request is null
            || request.VerifiedAt is null
            || request.ResetTokenHash is null
            || request.ResetTokenExpiresAt is null
            || request.ResetTokenExpiresAt <= now
            || !FixedTimeMatches(resetToken?.Trim() ?? string.Empty, request.ResetTokenHash))
        {
            return new(false, "Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        }

        user.PasswordHash = AuthService.HashPassword(password);
        request.ConsumedAt = now;
        await context.SaveChangesAsync(cancellationToken);

        return new(true, "Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
    }

    private async Task<User?> FindUserAsync(string email, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(email);
        return await context.Users
            .FirstOrDefaultAsync(candidate => candidate.Email.ToLower() == normalizedEmail, cancellationToken);
    }

    private Task<PasswordResetRequest?> FindLatestActiveRequestAsync(
        int userId,
        CancellationToken cancellationToken) =>
        context.PasswordResetRequests
            .Where(request => request.UserId == userId && request.ConsumedAt == null)
            .OrderByDescending(request => request.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    private static string NormalizeEmail(string? email) =>
        email?.Trim().ToLowerInvariant() ?? string.Empty;

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static bool FixedTimeMatches(string value, string storedHash)
    {
        var actual = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        var expected = Convert.FromHexString(storedHash);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    private static string BuildOtpEmail(string otp) => $"""
        <div style="font-family:Arial,sans-serif;color:#202124">
          <h2>Đặt lại mật khẩu MangaNPK</h2>
          <p>Mã OTP của bạn là:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px">{WebUtility.HtmlEncode(otp)}</p>
          <p>Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.</p>
        </div>
        """;
}
