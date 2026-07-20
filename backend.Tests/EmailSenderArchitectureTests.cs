using MangaNPK.Services.Email;
using Xunit;

namespace MangaNPK.Tests;

public class EmailSenderArchitectureTests
{
    [Fact]
    public void SmtpSender_DependsOnOptionsAndImplementsContract()
    {
        Assert.Contains(typeof(IEmailSender), typeof(SmtpEmailSender).GetInterfaces());

        foreach (var property in new[]
        {
            "Host", "Port", "EnableSsl", "Username", "Password", "FromAddress", "FromName"
        })
        {
            Assert.NotNull(typeof(SmtpOptions).GetProperty(property));
        }
    }

    [Fact]
    public void EmailMessage_ContainsOnlyDeliveryFields()
    {
        var message = new EmailMessage("reader@example.com", "OTP", "<strong>123456</strong>");

        Assert.Equal("reader@example.com", message.To);
        Assert.Equal("OTP", message.Subject);
        Assert.Equal("<strong>123456</strong>", message.HtmlBody);
    }
}
