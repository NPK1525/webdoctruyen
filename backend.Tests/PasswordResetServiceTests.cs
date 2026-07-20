using System.Text.RegularExpressions;
using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using MangaNPK.Services.Email;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MangaNPK.Tests;

public class PasswordResetServiceTests
{
    [Fact]
    public async Task RequestOtp_StoresHashAndEmailsSixDigits()
    {
        await using var context = CreateContext();
        context.Users.Add(NewUser());
        await context.SaveChangesAsync();
        var email = new RecordingEmailSender();
        var service = CreateService(context, email);

        var result = await service.RequestOtpAsync("reader@example.com");

        Assert.True(result.Succeeded);
        var message = Assert.Single(email.Messages);
        var otp = Regex.Match(message.HtmlBody, @"letter-spacing:6px"">(\d{6})<").Groups[1].Value;
        Assert.Matches(@"^\d{6}$", otp);
        var request = await context.PasswordResetRequests.SingleAsync();
        Assert.NotEqual(otp, request.OtpHash);
        Assert.Equal(64, request.OtpHash.Length);
    }

    [Fact]
    public async Task RequestOtp_UnknownOrLockedEmailReturnsGenericSuccessWithoutEmail()
    {
        await using var context = CreateContext();
        context.Users.Add(NewUser(isLocked: true));
        await context.SaveChangesAsync();
        var email = new RecordingEmailSender();
        var service = CreateService(context, email);

        var unknown = await service.RequestOtpAsync("unknown@example.com");
        var locked = await service.RequestOtpAsync("reader@example.com");

        Assert.True(unknown.Succeeded);
        Assert.True(locked.Succeeded);
        Assert.Equal(unknown.Message, locked.Message);
        Assert.Empty(email.Messages);
        Assert.Empty(context.PasswordResetRequests);
    }

    [Fact]
    public async Task RequestOtp_WithinCooldownDoesNotSendAnotherMessage()
    {
        await using var context = CreateContext();
        context.Users.Add(NewUser());
        await context.SaveChangesAsync();
        var email = new RecordingEmailSender();
        var service = CreateService(context, email);

        await service.RequestOtpAsync("reader@example.com");
        await service.RequestOtpAsync("reader@example.com");

        Assert.Single(email.Messages);
        Assert.Single(context.PasswordResetRequests);
    }

    [Fact]
    public async Task VerifyOtp_FiveFailuresInvalidatesRequest()
    {
        await using var context = CreateContext();
        context.Users.Add(NewUser());
        await context.SaveChangesAsync();
        var email = new RecordingEmailSender();
        var service = CreateService(context, email);
        await service.RequestOtpAsync("reader@example.com");

        for (var attempt = 0; attempt < 5; attempt++)
            Assert.False((await service.VerifyOtpAsync("reader@example.com", "000000")).Succeeded);

        var request = await context.PasswordResetRequests.SingleAsync();
        Assert.Equal(5, request.FailedAttempts);
        Assert.NotNull(request.ConsumedAt);
        Assert.False((await service.VerifyOtpAsync("reader@example.com", ExtractOtp(email))).Succeeded);
    }

    [Fact]
    public async Task VerifyOtp_ExpiredCodeIsRejected()
    {
        await using var context = CreateContext();
        context.Users.Add(NewUser());
        await context.SaveChangesAsync();
        var email = new RecordingEmailSender();
        var clock = new MutableTimeProvider(new DateTimeOffset(2026, 7, 20, 3, 0, 0, TimeSpan.Zero));
        var service = CreateService(context, email, clock);
        await service.RequestOtpAsync("reader@example.com");
        clock.Advance(TimeSpan.FromMinutes(11));

        var result = await service.VerifyOtpAsync("reader@example.com", ExtractOtp(email));

        Assert.False(result.Succeeded);
        Assert.NotNull((await context.PasswordResetRequests.SingleAsync()).ConsumedAt);
    }

    [Fact]
    public async Task ResetPassword_ConsumesTokenAndChangesHash()
    {
        await using var context = CreateContext();
        context.Users.Add(NewUser());
        await context.SaveChangesAsync();
        var email = new RecordingEmailSender();
        var service = CreateService(context, email);
        await service.RequestOtpAsync("reader@example.com");
        var verification = await service.VerifyOtpAsync("reader@example.com", ExtractOtp(email));
        Assert.True(verification.Succeeded, verification.Message);

        var reset = await service.ResetPasswordAsync(
            "reader@example.com", verification.ResetToken!, "NewPassword123", "NewPassword123");
        var reused = await service.ResetPasswordAsync(
            "reader@example.com", verification.ResetToken!, "AnotherPassword123", "AnotherPassword123");

        Assert.True(reset.Succeeded);
        Assert.False(reused.Succeeded);
        var user = await context.Users.SingleAsync();
        Assert.True(AuthService.VerifyPassword("NewPassword123", user.PasswordHash));
        Assert.NotNull((await context.PasswordResetRequests.SingleAsync()).ConsumedAt);
    }

    private static MangaDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MangaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new MangaDbContext(options);
    }

    private static User NewUser(bool isLocked = false) => new()
    {
        Username = "reader",
        Email = "reader@example.com",
        PasswordHash = AuthService.HashPassword("OldPassword123"),
        IsLocked = isLocked
    };

    private static PasswordResetService CreateService(
        MangaDbContext context,
        RecordingEmailSender email,
        TimeProvider? clock = null) =>
        new(context, email, clock ?? new MutableTimeProvider(new DateTimeOffset(2026, 7, 20, 3, 0, 0, TimeSpan.Zero)));

    private static string ExtractOtp(RecordingEmailSender email) =>
        Regex.Match(Assert.Single(email.Messages).HtmlBody, @"letter-spacing:6px"">(\d{6})<").Groups[1].Value;

    private sealed class RecordingEmailSender : IEmailSender
    {
        public List<EmailMessage> Messages { get; } = [];

        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            Messages.Add(message);
            return Task.CompletedTask;
        }
    }

    private sealed class MutableTimeProvider(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset _now = now;
        public override DateTimeOffset GetUtcNow() => _now;
        public void Advance(TimeSpan duration) => _now += duration;
    }
}
