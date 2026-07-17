using System.Net.Mail;
using System.Text.RegularExpressions;
using BCrypt.Net;

namespace MangaNPK.Services
{
    /// <summary>
    /// Centralized authentication helpers: hashing, validation.
    /// All password hashing uses BCrypt with per-password salts.
    /// </summary>
    public static class AuthService
    {
        // Work factor 12 = ~250ms on modern hardware, good balance of security vs UX
        private const int BcryptWorkFactor = 12;

        public static string HashPassword(string password)
            => BCrypt.Net.BCrypt.HashPassword(password, BcryptWorkFactor);

        public static bool VerifyPassword(string password, string hash)
        {
            try
            {
                // Support legacy SHA-256 hashes (64 hex chars) during migration
                if (hash.Length == 64 && IsHexString(hash))
                {
                    var sha256Hash = ComputeSha256(password);
                    return sha256Hash == hash;
                }
                return BCrypt.Net.BCrypt.Verify(password, hash);
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// After a successful legacy login, re-hash to BCrypt automatically.
        /// </summary>
        public static bool IsLegacyHash(string hash)
            => hash.Length == 64 && IsHexString(hash);

        public static bool IsValidUsername(string username)
            => Regex.IsMatch(username, @"^[A-Za-z0-9_-]{3,24}$");

        public static bool IsValidEmail(string email)
        {
            try
            {
                var address = new MailAddress(email);
                return address.Address.Equals(email, StringComparison.OrdinalIgnoreCase)
                       && email.Length <= 254;
            }
            catch
            {
                return false;
            }
        }

        public static bool IsValidPassword(string password)
            => password.Length >= 8
            && password.Length <= 128
            && password.Any(char.IsLetter)
            && password.Any(char.IsDigit);

        // ── Private helpers ───────────────────────────────────────────────────

        private static bool IsHexString(string s)
            => s.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));

        private static string ComputeSha256(string input)
        {
            var bytes = System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes).ToLower();
        }
    }
}
