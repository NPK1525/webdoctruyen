using System;

namespace MangaNPK.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string NormalizedUsername { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string NormalizedEmail { get; set; } = string.Empty;
        public string Role { get; set; } = "User"; // "User" or "Admin"
        public bool IsLocked { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public string? Badge { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public List<MangaContributor> MangaContributions { get; set; } = [];
        public List<PasswordResetRequest> PasswordResetRequests { get; set; } = [];
    }
}
