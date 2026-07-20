namespace MangaNPK.Contracts.Auth;

public sealed class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty;
}

public sealed class VerifyResetOtpDto
{
    public string Email { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}

public sealed class ResetPasswordDto
{
    public string Email { get; set; } = string.Empty;
    public string ResetToken { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
