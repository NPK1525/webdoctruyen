using MangaNPK.Contracts.Auth;
using MangaNPK.Controllers;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace MangaNPK.Tests;

public class PasswordResetControllerTests
{
    [Theory]
    [InlineData("forgot-password")]
    [InlineData("verify-reset-otp")]
    [InlineData("reset-password")]
    public void AuthController_DefinesPasswordResetRoute(string route)
    {
        Assert.Contains(typeof(AuthController).GetMethods(), method =>
            method.GetCustomAttributes(typeof(HttpPostAttribute), true)
                .Cast<HttpPostAttribute>()
                .Any(attribute => attribute.Template == route));
    }

    [Fact]
    public void PasswordResetDtos_ExposeOnlyRequiredClientFields()
    {
        Assert.Equal(new[] { "Email" }, PropertyNames<ForgotPasswordDto>());
        Assert.Equal(new[] { "Email", "Otp" }, PropertyNames<VerifyResetOtpDto>());
        Assert.Equal(
            new[] { "ConfirmPassword", "Email", "Password", "ResetToken" },
            PropertyNames<ResetPasswordDto>());
    }

    private static string[] PropertyNames<T>() => typeof(T).GetProperties()
        .Select(property => property.Name)
        .OrderBy(name => name)
        .ToArray();
}
