using MangaNPK.Data;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MangaNPK.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MangaController(MangaDbContext context) : ControllerBase
    {
        private const int FuzzyCandidateLimit = 500;
        private readonly MangaDbContext _context = context;

        // GET: api/manga
        [HttpGet]
        public async Task<IActionResult> GetMangas(
            [FromQuery] MangaType? type = null,
            [FromQuery] int? genreId = null,
            [FromQuery] MangaDemographic? demographic = null,
            [FromQuery] MangaFormat? format = null,
            [FromQuery] MangaStatus? status = null,
            [FromQuery] int? themeId = null,
            [FromQuery] int? releaseYear = null,
            [FromQuery] string? search = null,
            [FromQuery] string? sort = null,
            [FromQuery] bool fuzzy = false,
            [FromQuery] string? source = null,
            [FromQuery] string? chapterState = null,
            [FromQuery] string? includeGenreIds = null,
            [FromQuery] string? excludeGenreIds = null,
            [FromQuery] string? includeThemeIds = null,
            [FromQuery] string? excludeThemeIds = null,
            [FromQuery] string? includeFormats = null,
            [FromQuery] string? excludeFormats = null,
            [FromQuery] string? includeContent = null,
            [FromQuery] string? excludeContent = null,
            [FromQuery] string? authorIds = null,
            [FromQuery] string? artistIds = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            page = Math.Max(1, page);
            pageSize = pageSize is 20 or 50 or 100 ? pageSize : 20;
            var query = _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MangaAuthors).ThenInclude(ma => ma.Author)
                .Include(m => m.MangaThemes).ThenInclude(mt => mt.Theme)
                .Include(m => m.Chapters)
                .AsQueryable();

            if (type.HasValue)
            {
                query = query.Where(m => m.Type == type.Value);
            }

            if (genreId.HasValue)
            {
                query = query.Where(m => m.MangaGenres.Any(mg => mg.GenreId == genreId.Value));
            }

            if (demographic.HasValue)
            {
                query = query.Where(m => m.Demographic == demographic.Value);
            }

            if (format.HasValue)
            {
                query = query.Where(m => m.Format == format.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(m => m.Status == status.Value);
            }

            if (themeId.HasValue)
            {
                query = query.Where(m => m.MangaThemes.Any(mt => mt.ThemeId == themeId.Value));
            }

            if (releaseYear.HasValue)
            {
                query = query.Where(m => m.ReleaseYear == releaseYear.Value);
            }

            if (string.Equals(source, "Local", StringComparison.OrdinalIgnoreCase))
                query = query.Where(m => m.Source == "Local");
            else if (string.Equals(source, "MangaDex", StringComparison.OrdinalIgnoreCase))
                query = query.Where(m => m.Source == "MangaDex");

            if (string.Equals(chapterState, "with-chapters", StringComparison.OrdinalIgnoreCase))
                query = query.Where(m => m.Chapters.Any());
            else if (string.Equals(chapterState, "without-chapters", StringComparison.OrdinalIgnoreCase))
                query = query.Where(m => !m.Chapters.Any());

            var includeGenres = ParseIds(includeGenreIds);
            var excludeGenres = ParseIds(excludeGenreIds);
            var includeThemes = ParseIds(includeThemeIds);
            var excludeThemes = ParseIds(excludeThemeIds);
            var includeFormatValues = ParseFormats(includeFormats);
            var excludeFormatValues = ParseFormats(excludeFormats);
            var includeContentValues = ParseValues(includeContent);
            var excludeContentValues = ParseValues(excludeContent);
            var selectedAuthors = ParseIds(authorIds);
            var selectedArtists = ParseIds(artistIds);

            if (includeGenres.Count > 0)
                query = query.Where(m => m.MangaGenres.Any(link => includeGenres.Contains(link.GenreId)));
            if (excludeGenres.Count > 0)
                query = query.Where(m => !m.MangaGenres.Any(link => excludeGenres.Contains(link.GenreId)));
            if (includeThemes.Count > 0)
                query = query.Where(m => m.MangaThemes.Any(link => includeThemes.Contains(link.ThemeId)));
            if (excludeThemes.Count > 0)
                query = query.Where(m => !m.MangaThemes.Any(link => excludeThemes.Contains(link.ThemeId)));
            if (includeFormatValues.Count > 0)
                query = query.Where(m => includeFormatValues.Contains(m.Format));
            if (excludeFormatValues.Count > 0)
                query = query.Where(m => !excludeFormatValues.Contains(m.Format));
            if (includeContentValues.Count > 0)
                query = query.Where(m => includeContentValues.Any(value => m.ContentWarnings.Contains(value)));
            if (excludeContentValues.Count > 0)
                query = query.Where(m => !excludeContentValues.Any(value => m.ContentWarnings.Contains(value)));
            if (selectedAuthors.Count > 0)
                query = query.Where(m => m.MangaAuthors.Any(link =>
                    selectedAuthors.Contains(link.AuthorId) &&
                    (link.Role == ContributorRoleClassifier.StoryAndArt ||
                     link.Role.StartsWith(ContributorRoleClassifier.Story))));
            if (selectedArtists.Count > 0)
                query = query.Where(m => m.MangaAuthors.Any(link =>
                    selectedArtists.Contains(link.AuthorId) &&
                    (link.Role == ContributorRoleClassifier.StoryAndArt ||
                     link.Role.StartsWith(ContributorRoleClassifier.Art))));

            var normalizedSearch = MangaSearchRanking.Normalize(search);

            if (fuzzy && normalizedSearch.Length > 0)
            {
                var cleanSearch = search!.Trim();
                var likeSearch = $"%{cleanSearch}%";

                var candidatesQuery = query.Where(m =>
                    EF.Functions.Like(m.Title, likeSearch) ||
                    EF.Functions.Like(m.AlternativeTitle ?? "", likeSearch) ||
                    m.MangaAuthors.Any(ma => EF.Functions.Like(ma.Author.Name, likeSearch)));

                var directCandidates = await SelectPickerCandidates(
                        candidatesQuery
                            .OrderByDescending(m => m.CreatedAt)
                            .ThenByDescending(m => m.Id)
                            .Take(FuzzyCandidateLimit))
                    .ToListAsync();

                var candidates = directCandidates;
                var remainingCandidateSlots = FuzzyCandidateLimit - candidates.Count;
                if (remainingCandidateSlots > 0)
                {
                    var directCandidateIds = directCandidates.Select(candidate => candidate.Id).ToList();
                    var fallbackQuery = query;
                    if (directCandidateIds.Count > 0)
                        fallbackQuery = fallbackQuery.Where(manga => !directCandidateIds.Contains(manga.Id));

                    var fallbackCandidates = await SelectPickerCandidates(
                            fallbackQuery
                                .OrderByDescending(manga => manga.CreatedAt)
                                .ThenByDescending(manga => manga.Id)
                                .Take(remainingCandidateSlots))
                        .ToListAsync();

                    candidates.AddRange(fallbackCandidates);
                }

                foreach (var candidate in candidates)
                    candidate.SearchScore = MangaSearchRanking.Score(
                        normalizedSearch, candidate.Title, candidate.AlternativeTitle,
                        string.Join(' ', candidate.AuthorNames));

                IEnumerable<MangaPickerCandidate> ranked = candidates;
                if (normalizedSearch.Length > 0)
                    ranked = ranked.Where(candidate => candidate.SearchScore > 0);
                ranked = SortPickerCandidates(ranked, sort, normalizedSearch.Length > 0);
                var rankedList = ranked.ToList();
                var total = rankedList.Count;
                var pageItems = rankedList.Skip((page - 1) * pageSize).Take(pageSize)
                    .Select(candidate => new
                    {
                        candidate.Id,
                        candidate.Title,
                        candidate.AlternativeTitle,
                        candidate.CoverUrl,
                        candidate.Type,
                        candidate.ReleaseYear,
                        candidate.CreatedAt,
                        candidate.LatestUpload,
                        candidate.RatingAverage,
                        candidate.FollowCount
                    }).ToList();
                return Ok(new
                {
                    totalCount = total,
                    totalItems = total,
                    totalPages = (int)Math.Ceiling(total / (double)pageSize),
                    items = pageItems,
                    page,
                    pageSize
                });
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var cleanSearch = search.Trim();
                var likeSearch = $"%{cleanSearch}%";
                query = query.Where(m => EF.Functions.Like(m.Title, likeSearch) ||
                                         EF.Functions.Like(m.AlternativeTitle ?? "", likeSearch) ||
                                         m.MangaAuthors.Any(ma => EF.Functions.Like(ma.Author.Name, likeSearch)));
            }

            // Lấy tổng số truyện trước khi phân trang để frontend biết còn bao nhiêu trang.
            var totalCount = await query.CountAsync();

            query = sort switch
            {
                "title" or "title-asc" => query.OrderBy(m => m.Title).ThenBy(m => m.Id),
                "oldest" => query.OrderBy(m => m.CreatedAt).ThenBy(m => m.Id),
                "chapter-count" => query.OrderByDescending(m => m.Chapters.Count).ThenBy(m => m.Title),
                "year" => query.OrderByDescending(m => m.ReleaseYear ?? 0).ThenBy(m => m.Title),
                "views" => query.OrderByDescending(m => m.ViewCount).ThenBy(m => m.Title),
                "latest" => query.OrderByDescending(m => m.Chapters.Max(c => (DateTime?)c.UploadedAt) ?? m.CreatedAt),
                _ => query.OrderByDescending(m => m.CreatedAt)
            };

            // Lấy danh sách truyện của trang hiện tại, chỉ chọn các trường cần hiển thị ngoài trang chủ.
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new {
                    m.Id,
                    m.Title,
                    m.AlternativeTitle,
                    m.Description,
                    m.CoverUrl,
                    m.Type,
                    m.Status,
                    m.Demographic,
                    m.Format,
                    m.ReleaseYear,
                    m.ViewCount,
                    RatingAverage = _context.Ratings.Where(r => r.MangaId == m.Id).Select(r => (double?)r.Score).Average() ?? 0,
                    RatingCount = _context.Ratings.Count(r => r.MangaId == m.Id),
                    CommentCount = _context.Comments.Count(c => c.MangaId == m.Id),
                    FollowCount = _context.UserMangaLibraries.Count(uml => uml.MangaId == m.Id),
                    Genres = m.MangaGenres.Select(mg => mg.Genre.Name).ToList(),
                    Themes = m.MangaThemes.Select(mt => mt.Theme.Name).ToList(),
                    Authors = m.MangaAuthors.Select(ma => new { ma.Author.Name, ma.Role }).ToList(),
                    LatestChapters = m.Chapters
                        .OrderByDescending(c => c.ChapterNumber)
                        .Take(2)
                        .Select(c => new { c.Id, c.ChapterNumber, c.Title, c.UploadedAt })
                        .ToList()
                })
                .ToListAsync();

            return Ok(new { totalCount, totalItems = totalCount, totalPages = (int)Math.Ceiling(totalCount / (double)pageSize), items, page, pageSize });
        }

        private static List<int> ParseIds(string? value) =>
            [.. (value ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(item => int.TryParse(item, out var id) ? id : 0)
                .Where(id => id > 0)
                .Distinct()];

        private static List<MangaFormat> ParseFormats(string? value) =>
            [.. (value ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(item => Enum.TryParse<MangaFormat>(item, true, out var format)
                    ? format
                    : int.TryParse(item, out var numeric) && Enum.IsDefined(typeof(MangaFormat), numeric)
                        ? (MangaFormat)numeric
                        : MangaFormat.None)
                .Where(format => format != MangaFormat.None)
                .Distinct()];

        private static List<string> ParseValues(string? value) =>
            [.. (value ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(item => item.Trim())
                .Where(item => item.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)];

        private IQueryable<MangaPickerCandidate> SelectPickerCandidates(IQueryable<Manga> source) =>
            source.AsNoTracking()
                .Select(m => new MangaPickerCandidate
                {
                    Id = m.Id,
                    Title = m.Title,
                    AlternativeTitle = m.AlternativeTitle,
                    CoverUrl = m.CoverUrl,
                    Type = m.Type,
                    ReleaseYear = m.ReleaseYear,
                    CreatedAt = m.CreatedAt,
                    LatestUpload = m.Chapters.Max(c => (DateTime?)c.UploadedAt),
                    RatingAverage = _context.Ratings.Where(r => r.MangaId == m.Id)
                        .Select(r => (double?)r.Score).Average() ?? 0,
                    FollowCount = _context.UserMangaLibraries.Count(item => item.MangaId == m.Id),
                    AuthorNames = m.MangaAuthors.Select(item => item.Author.Name).ToList()
                });

        private static IEnumerable<MangaPickerCandidate> SortPickerCandidates(
            IEnumerable<MangaPickerCandidate> candidates,
            string? sort,
            bool hasSearch)
        {
            return sort switch
            {
                "latest" => candidates.OrderByDescending(item => item.LatestUpload ?? item.CreatedAt).ThenBy(item => item.Title),
                "oldest-upload" => candidates.OrderBy(item => item.LatestUpload ?? item.CreatedAt).ThenBy(item => item.Title),
                "title-asc" => candidates.OrderBy(item => item.Title).ThenBy(item => item.Id),
                "title-desc" => candidates.OrderByDescending(item => item.Title).ThenBy(item => item.Id),
                "rating-desc" => candidates.OrderByDescending(item => item.RatingAverage).ThenBy(item => item.Title),
                "rating-asc" => candidates.OrderBy(item => item.RatingAverage).ThenBy(item => item.Title),
                "follows-desc" => candidates.OrderByDescending(item => item.FollowCount).ThenBy(item => item.Title),
                "follows-asc" => candidates.OrderBy(item => item.FollowCount).ThenBy(item => item.Title),
                "oldest-added" => candidates.OrderBy(item => item.CreatedAt).ThenBy(item => item.Title),
                "year-asc" => candidates.OrderBy(item => item.ReleaseYear ?? int.MaxValue).ThenBy(item => item.Title),
                "year-desc" => candidates.OrderByDescending(item => item.ReleaseYear ?? 0).ThenBy(item => item.Title),
                "recent" => candidates.OrderByDescending(item => item.CreatedAt).ThenBy(item => item.Title),
                _ when hasSearch => candidates.OrderByDescending(item => item.SearchScore).ThenBy(item => item.Title),
                _ => candidates.OrderByDescending(item => item.CreatedAt).ThenBy(item => item.Title)
            };
        }

        [HttpGet("random")]
        public async Task<IActionResult> GetRandomManga(
            [FromQuery] MangaType? type = null,
            [FromQuery] MangaDemographic? demographic = null,
            [FromQuery] MangaStatus? status = null,
            [FromQuery] int? releaseYear = null,
            [FromQuery] string? search = null)
        {
            var query = _context.Mangas.AsQueryable();

            if (type.HasValue) query = query.Where(m => m.Type == type.Value);
            if (demographic.HasValue) query = query.Where(m => m.Demographic == demographic.Value);
            if (status.HasValue) query = query.Where(m => m.Status == status.Value);
            if (releaseYear.HasValue) query = query.Where(m => m.ReleaseYear == releaseYear.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var cleanSearch = search.Trim();
                var likeSearch = $"%{cleanSearch}%";
                query = query.Where(m => EF.Functions.Like(m.Title, likeSearch) ||
                                         EF.Functions.Like(m.AlternativeTitle ?? "", likeSearch));
            }

            // Random theo bộ lọc hiện tại mà không cần tải toàn bộ truyện về trình duyệt.
            var total = await query.CountAsync();
            if (total == 0)
                return NotFound(new { message = "No manga found" });

            var skip = Random.Shared.Next(total);
            var manga = await query
                .OrderBy(m => m.Id)
                .Skip(skip)
                .Select(m => new { m.Id })
                .FirstAsync();

            return Ok(manga);
        }

        // GET: api/manga/featured
        [HttpGet("featured")]
        public async Task<IActionResult> GetFeatured()
        {
            var featured = await _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MangaAuthors).ThenInclude(ma => ma.Author)
                .Include(m => m.MangaThemes).ThenInclude(mt => mt.Theme)
                .OrderByDescending(m => m.CreatedAt)
                .Take(4)
                .Select(m => new {
                    m.Id,
                    m.Title,
                    m.AlternativeTitle,
                    m.Description,
                    m.CoverUrl,
                    m.Type,
                    m.Status,
                    m.Demographic,
                    m.Format,
                    Genres = m.MangaGenres.Select(mg => mg.Genre.Name).ToList(),
                    Themes = m.MangaThemes.Select(mt => mt.Theme.Name).ToList(),
                    Authors = m.MangaAuthors.Select(ma => new { ma.Author.Name, ma.Role }).ToList()
                })
                .ToListAsync();

            return Ok(featured);
        }

        // GET: api/manga/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMangaDetail(int id)
        {
            var manga = await _context.Mangas
                .Include(m => m.MangaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MangaAuthors).ThenInclude(ma => ma.Author)
                .Include(m => m.MangaThemes).ThenInclude(mt => mt.Theme)
                .Include(m => m.Chapters)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (manga == null)
            {
                return NotFound(new { message = "Manga not found" });
            }

            var ratingStats = await _context.Ratings
                .AsNoTracking()
                .Where(r => r.MangaId == id)
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    Average = group.Average(r => r.Score),
                    Count = group.Count()
                })
                .FirstOrDefaultAsync();

            var commentCount = await _context.Comments
                .AsNoTracking()
                .CountAsync(c => c.MangaId == id);

            var followCount = await _context.UserMangaLibraries
                .AsNoTracking()
                .CountAsync(uml => uml.MangaId == id);

            var result = new
            {
                manga.Id,
                manga.Title,
                manga.AlternativeTitle,
                manga.Description,
                manga.CoverUrl,
                manga.Type,
                manga.Status,
                manga.Demographic,
                manga.Format,
                manga.ContentWarnings,
                manga.ViewCount,
                manga.ReleaseYear,
                manga.CreatedAt,
                RatingAverage = ratingStats?.Average ?? 0,
                RatingCount = ratingStats?.Count ?? 0,
                CommentCount = commentCount,
                FollowCount = followCount,
                Genres = manga.MangaGenres.Select(mg => new { mg.Genre.Id, mg.Genre.Name }).ToList(),
                Themes = manga.MangaThemes.Select(mt => new { mt.Theme.Id, mt.Theme.Name }).ToList(),
                Authors = manga.MangaAuthors.Select(ma => new { ma.Author.Id, ma.Author.Name, ma.Role }).ToList(),
                Chapters = manga.Chapters
                    .OrderByDescending(c => c.ChapterNumber)
                    .Select(c => new { c.Id, c.ChapterNumber, c.Title, c.UploadedAt, c.ViewCount })
                    .ToList()
            };

            return Ok(result);
        }

        [HttpPost("{id}/view")]
        public async Task<IActionResult> IncrementViewCount(int id, [FromQuery] int? chapterId = null)
        {
            var manga = await _context.Mangas.FirstOrDefaultAsync(m => m.Id == id);
            if (manga == null)
                return NotFound(new { message = "Manga not found" });

            // Nếu lượt đọc đến từ trang đọc truyện thì kiểm tra chương có thuộc đúng truyện không.
            Chapter? chapter = null;
            if (chapterId.HasValue)
            {
                chapter = await _context.Chapters
                    .FirstOrDefaultAsync(c => c.Id == chapterId.Value && c.MangaId == id);
                if (chapter == null)
                    return BadRequest(new { message = "Chapter does not belong to this manga" });
            }

            // Chặn cộng trùng: trang đọc gửi chapterId nên mỗi chương chỉ được tính một lần trong phiên hiện tại.
            // Trang chi tiết không gọi endpoint này nữa, nên mở chi tiết rồi đọc truyện sẽ không bị cộng đôi.
            var sessionKey = chapterId.HasValue
                ? $"viewed_manga_{id}_chapter_{chapterId.Value}"
                : $"viewed_manga_{id}";
            if (HttpContext.Session.GetString(sessionKey) == null)
            {
                HttpContext.Session.SetString(sessionKey, "1");
                manga.ViewCount += 1;
                if (chapter != null)
                    chapter.ViewCount += 1;
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                viewCount = manga.ViewCount,
                chapterViewCount = chapter?.ViewCount
            });
        }

        // GET: api/manga/{id}/recommendations
        [HttpGet("{id}/recommendations")]
        public async Task<IActionResult> GetRecommendations(int id, [FromQuery] int limit = 6)
        {
            var manga = await _context.Mangas
                .Include(m => m.MangaGenres)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (manga == null)
            {
                return NotFound(new { message = "Manga not found" });
            }

            var genreIds = manga.MangaGenres.Select(mg => mg.GenreId).ToList();

            if (genreIds.Count == 0)
            {
                var fallback = await _context.Mangas
                    .Where(m => m.Id != id)
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(limit)
                    .Select(m => new {
                        m.Id,
                        m.Title,
                        m.AlternativeTitle,
                        m.CoverUrl,
                        m.Type,
                        m.Status,
                        m.ReleaseYear
                    })
                    .ToListAsync();
                return Ok(fallback);
            }

            var recommendations = await _context.Mangas
                .Include(m => m.MangaGenres)
                .Where(m => m.Id != id)
                .Select(m => new {
                    Manga = new {
                        m.Id,
                        m.Title,
                        m.AlternativeTitle,
                        m.CoverUrl,
                        m.Type,
                        m.Status,
                        m.ReleaseYear
                    },
                    SharedCount = m.MangaGenres.Count(mg => genreIds.Contains(mg.GenreId))
                })
                .Where(x => x.SharedCount > 0)
                .OrderByDescending(x => x.SharedCount)
                .ThenByDescending(x => x.Manga.Id)
                .Take(limit)
                .Select(x => x.Manga)
                .ToListAsync();

            return Ok(recommendations);
        }
    }

    internal sealed class MangaPickerCandidate
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string AlternativeTitle { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;
        public MangaType Type { get; set; }
        public int? ReleaseYear { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LatestUpload { get; set; }
        public double RatingAverage { get; set; }
        public int FollowCount { get; set; }
        public List<string> AuthorNames { get; set; } = [];
        public int SearchScore { get; set; }
    }
}
