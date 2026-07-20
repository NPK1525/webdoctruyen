namespace MangaNPK.Models;

public sealed class PasswordResetRequest
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string OtpHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime LastSentAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? ResetTokenHash { get; set; }
    public DateTime? ResetTokenExpiresAt { get; set; }
    public DateTime? ConsumedAt { get; set; }
}
