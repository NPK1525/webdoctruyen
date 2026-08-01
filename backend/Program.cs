using AspNetCoreRateLimit;
using MangaNPK.Data;
using MangaNPK.Services;
using MangaNPK.Services.Email;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// ── Data Protection ───────────────────────────────────────────────────────────
var dataProtectionKeysPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "DataProtectionKeys");
Directory.CreateDirectory(dataProtectionKeysPath);
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<MangaDbContext>(options =>
    // Tắt retry strategy mặc định để các transaction thủ công trong AdminController chạy ổn định.
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── MVC + JSON ────────────────────────────────────────────────────────────────
builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
})
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// ── Session ───────────────────────────────────────────────────────────────────
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.None
        : CookieSecurePolicy.Always;
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient<MangaDexService>();
builder.Services.AddScoped<IMangaDexChapterPageService>(provider =>
    new CachedMangaDexChapterPageService(
        provider.GetRequiredService<MangaDexService>(),
        provider.GetRequiredService<IMemoryCache>()));
builder.Services.AddScoped<IMangaDexService>(provider =>
    new LoggingMangaDexProxy(
        provider.GetRequiredService<MangaDexService>(),
        provider.GetRequiredService<ILogger<LoggingMangaDexProxy>>()));
builder.Services.AddScoped<TitleSubmissionMangaCreator>();
builder.Services.AddScoped<TitleSubmissionService>();
builder.Services.AddScoped<MangaContributorAuthorizationService>();
builder.Services.AddScoped<ChapterAdminService>();
builder.Services.AddScoped<CatalogMangaCreator>();
builder.Services.AddScoped<CatalogAdminService>();
builder.Services.AddScoped<GenreDeduplicationService>();
builder.Services.AddScoped<MangaDexMangaCreator>();
builder.Services.AddScoped<MangaDexImportService>();
builder.Services.AddScoped<TitleDraftMangaCreator>();
builder.Services.AddScoped<TitleDraftAdminService>();
builder.Services.AddScoped<IFollowedUpdatesService, FollowedUpdatesService>();
builder.Services.AddScoped<MangaListService>();
builder.Services.AddScoped<IReportCommandHandler, UpdateReportStatusCommandHandler>();
builder.Services.AddOptions<SmtpOptions>()
    .BindConfiguration(SmtpOptions.SectionName);
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<PasswordResetService>();

// ── Same-origin request protection ────────────────────────────────────────────
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy =
        builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing")
            ? CookieSecurePolicy.None
            : CookieSecurePolicy.Always;
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
builder.Services.AddInMemoryRateLimiting();

// ── OpenAPI ───────────────────────────────────────────────────────────────────
builder.Services.AddOpenApi();

var app = builder.Build();

// ── Database Seed ─────────────────────────────────────────────────────────────
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<MangaDbContext>();
        MangaDbSeeder.Seed(context, builder.Configuration);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"An error occurred while migrating or seeding the database: {ex}");
    }
}

// ── Middleware Pipeline ───────────────────────────────────────────────────────
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseIpRateLimiting();
app.Use(async (context, next) =>
{
    var destination = LegacyRouteRedirect.Resolve(
        context.Request.Path.Value,
        context.Request.Query["mangaId"].FirstOrDefault(),
        context.Request.Query["chapterId"].FirstOrDefault());

    if (destination is not null)
    {
        context.Response.Redirect(destination, permanent: false);
        return;
    }

    await next();
});
app.UseStaticFiles();
app.UseSession();
app.UseAuthorization();

// MVC routes
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// API routes
app.MapControllers();

app.Run();

public partial class Program;
