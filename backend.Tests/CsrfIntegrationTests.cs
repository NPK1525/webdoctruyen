using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace MangaNPK.Tests;

public sealed class CsrfIntegrationTests : IClassFixture<CsrfIntegrationTests.Factory>
{
    private readonly HttpClient _client;

    public CsrfIntegrationTests(Factory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    [Fact]
    public async Task UnsafeRequest_WithoutAntiforgeryToken_IsRejected()
    {
        using var response = await _client.PostAsync("/api/auth/logout", content: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UnsafeRequest_WithAntiforgeryToken_IsAccepted()
    {
        var token = await _client.GetFromJsonAsync<CsrfTokenResponse>("/api/security/csrf");
        Assert.False(string.IsNullOrWhiteSpace(token?.RequestToken));

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.Add("X-CSRF-TOKEN", token!.RequestToken);
        using var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ProfileRoute_UsesMvcAndLegacyUrlRedirects()
    {
        using var profile = await _client.GetAsync("/profile");
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);

        using var legacy = await _client.GetAsync("/profile.html");
        Assert.Equal(HttpStatusCode.Redirect, legacy.StatusCode);
        Assert.Equal("/profile", legacy.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task VendoredLucideBundle_IsServedLocally()
    {
        using var response = await _client.GetAsync("/vendor/lucide/lucide.min.js");
        var source = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("createIcons", source, StringComparison.Ordinal);
    }

    public sealed class Factory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
        }
    }

    private sealed record CsrfTokenResponse(string RequestToken);
}
