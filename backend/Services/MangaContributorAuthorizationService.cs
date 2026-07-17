using MangaNPK.Data;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Services;

public sealed class MangaContributorAuthorizationService(MangaDbContext context)
{
    private readonly MangaDbContext _context = context;

    public async Task<bool> CanManageChapterAsync(int userId, int mangaId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (IsAllowed(user?.Role, false)) return true;

        var isContributor = await _context.MangaContributors.AsNoTracking()
            .AnyAsync(c => c.UserId == userId && c.MangaId == mangaId, cancellationToken);
        return IsAllowed(user?.Role, isContributor);
    }

    public static bool IsAllowed(string? role, bool isContributor) =>
        string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
        (string.Equals(role, "User", StringComparison.OrdinalIgnoreCase) && isContributor);
}
