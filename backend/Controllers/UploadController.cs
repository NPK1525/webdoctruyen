using MangaNPK.Filters;
using Microsoft.AspNetCore.Mvc;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [RequireAuth]
    public class UploadController(IWebHostEnvironment env) : ControllerBase
    {
        private readonly IWebHostEnvironment _env = env;

        private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

        // Magic-byte signatures for allowed image types
        private static readonly Dictionary<string, byte[][]> MagicBytes = new()
        {
            [".jpg"]  = [[0xFF, 0xD8, 0xFF]],
            [".jpeg"] = [[0xFF, 0xD8, 0xFF]],
            [".png"]  = [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
            [".gif"]  = [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
            [".webp"] = [[0x52, 0x49, 0x46, 0x46]], // RIFF header; full check below
        };

        [HttpPost]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { message = $"Invalid file type. Allowed: {string.Join(", ", AllowedExtensions)}" });

            if (!await IsValidImageAsync(file, ext))
                return BadRequest(new { message = "File content does not match the declared image type." });

            var uploadsDir = Path.Combine(_env.WebRootPath, "uploads");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new { url = $"/uploads/{fileName}", fileName });
        }

        [HttpPost("multiple")]
        [RequestSizeLimit(100 * 1024 * 1024)]
        public async Task<IActionResult> UploadMultiple(IFormFileCollection files)
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { message = "No files provided" });

            var uploadsDir = Path.Combine(_env.WebRootPath, "uploads");
            Directory.CreateDirectory(uploadsDir);

            var results = new List<object>();

            foreach (var file in files)
            {
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

                if (!AllowedExtensions.Contains(ext))
                {
                    results.Add(new { fileName = file.FileName, error = $"Invalid type: {ext}" });
                    continue;
                }

                if (!await IsValidImageAsync(file, ext))
                {
                    results.Add(new { fileName = file.FileName, error = "File content does not match the declared image type." });
                    continue;
                }

                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadsDir, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                results.Add(new { url = $"/uploads/{fileName}", fileName });
            }

            return Ok(new { files = results });
        }

        // ── Private helpers ───────────────────────────────────────────────────

        private static async Task<bool> IsValidImageAsync(IFormFile file, string ext)
        {
            if (!MagicBytes.TryGetValue(ext, out var signatures))
                return false;

            // Read enough bytes for the longest signature (8 bytes for PNG)
            var buffer = new byte[12];
            using var stream = file.OpenReadStream();
            var bytesRead = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length));

            foreach (var sig in signatures)
            {
                if (bytesRead >= sig.Length && buffer.Take(sig.Length).SequenceEqual(sig))
                    return true;
            }

            return false;
        }
    }
}
