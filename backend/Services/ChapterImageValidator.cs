using Microsoft.AspNetCore.Http;

namespace MangaNPK.Services;

public static class ChapterImageValidator
{
    public const int MaxFileCount = 500;
    public const long MaxFileSize = 15 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".gif" };

    public static async Task<string?> ValidateAsync(
        IReadOnlyList<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        if (files.Count > MaxFileCount)
            return $"Mỗi chapter chỉ được tải tối đa {MaxFileCount} ảnh.";

        foreach (var file in files)
        {
            if (file.Length <= 0)
                return $"Ảnh “{file.FileName}” đang trống.";

            if (file.Length > MaxFileSize)
                return $"Ảnh “{file.FileName}” vượt quá giới hạn 15 MB.";

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(extension))
                return $"Ảnh “{file.FileName}” không đúng định dạng JPG, PNG, WebP hoặc GIF.";

            if (!await HasMatchingSignatureAsync(file, extension, cancellationToken))
                return $"Nội dung ảnh “{file.FileName}” không khớp với định dạng file.";
        }

        return null;
    }

    public static string GetSafeExtension(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension == ".jpeg" ? ".jpg" : extension;
    }

    private static async Task<bool> HasMatchingSignatureAsync(
        IFormFile file,
        string extension,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[12];
        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(buffer.AsMemory(), cancellationToken);
        extension = extension.ToLowerInvariant();

        return extension switch
        {
            ".jpg" or ".jpeg" => StartsWith(buffer, bytesRead, [0xFF, 0xD8, 0xFF]),
            ".png" => StartsWith(buffer, bytesRead, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            ".gif" => StartsWith(buffer, bytesRead, "GIF87a"u8) || StartsWith(buffer, bytesRead, "GIF89a"u8),
            ".webp" => StartsWith(buffer, bytesRead, "RIFF"u8)
                && bytesRead >= 12
                && buffer.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
    }

    private static bool StartsWith(byte[] buffer, int bytesRead, ReadOnlySpan<byte> signature)
    {
        return bytesRead >= signature.Length
            && buffer.AsSpan(0, signature.Length).SequenceEqual(signature);
    }
}
