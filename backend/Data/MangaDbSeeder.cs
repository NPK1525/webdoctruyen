using System;
using System.Collections.Generic;
using System.Linq;
using MangaNPK.Models;
using MangaNPK.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace MangaNPK.Data
{
    public static class MangaDbSeeder
    {
        public static void Seed(MangaDbContext context, IConfiguration configuration)
        {
            context.Database.Migrate();

            if (!context.Genres.Any())
            {
                var genres = new List<Genre>
                {
                    new() { Name = "Hành động", Slug = "hanh-dong" },
                    new() { Name = "Hài hước", Slug = "hai-huoc" },
                    new() { Name = "Viễn tưởng", Slug = "vien-tuong" },
                    new() { Name = "Kỳ ảo (Fantasy)", Slug = "ky-ao" },
                    new() { Name = "Phiêu lưu", Slug = "phieu-luu" },
                    new() { Name = "Võ thuật", Slug = "vo-thuat" },
                    new() { Name = "Học đường", Slug = "hoc-duong" },
                    new() { Name = "Đời thường", Slug = "doi-thuong" }
                };
                context.Genres.AddRange(genres);
                context.SaveChanges();
            }

            if (!context.Authors.Any())
            {
                var authors = new List<Author>
                {
                    new() { Name = "ONE", Biography = "Tác giả manga và webcomic nổi tiếng người Nhật Bản, cha đẻ của One-Punch Man và Mob Psycho 100." },
                    new() { Name = "Yusuke Murata", Biography = "Họa sĩ manga Nhật Bản nổi tiếng với phong cách vẽ chi tiết, sống động và các cảnh hành động hoành tráng trong One-Punch Man." },
                    new() { Name = "Chugong", Biography = "Nhà văn viết tiểu thuyết mạng Hàn Quốc, tác giả của bộ truyện Solo Leveling nổi tiếng toàn cầu." },
                    new() { Name = "DUBU (Redice Studio)", Biography = "Họa sĩ vẽ tranh webtoon Hàn Quốc xuất sắc, người thổi hồn vào Solo Leveling qua nét vẽ đầy uy lực." },
                    new() { Name = "Mạc Mặc", Biography = "Tác giả tiểu thuyết võ hiệp, tu chân nổi tiếng của Trung Quốc." },
                    new() { Name = "Pikapi", Biography = "Studio vẽ tranh manhua nổi tiếng, đảm nhận minh họa cho Võ Luyện Đỉnh Phong." }
                };
                context.Authors.AddRange(authors);
                context.SaveChanges();
            }

            if (!context.Themes.Any())
            {
                var themes = new List<Theme>
                {
                    new() { Name = "Magic", Slug = "magic" },
                    new() { Name = "Reincarnation", Slug = "reincarnation" },
                    new() { Name = "Monsters", Slug = "monsters" },
                    new() { Name = "Survival", Slug = "survival" },
                    new() { Name = "Harem", Slug = "harem" }
                };
                context.Themes.AddRange(themes);
                context.SaveChanges();
            }

            EnsureMangaDexTaxonomy(context);

            var genresMap = context.Genres.ToDictionary(g => g.Slug, g => g);
            var authorsMap = context.Authors.ToDictionary(a => a.Name, a => a);
            var themesMap = context.Themes.ToDictionary(t => t.Slug, t => t);

            if (!context.Mangas.Any(m => m.Title == "One Punch Man"))
            {
                var opm = new Manga
                {
                    Title = "One Punch Man",
                    AlternativeTitle = "Nhất Đấm Siêu Nhân",
                    Description = "Saitama là một siêu anh hùng siêu mạnh, người luôn chán nản vì có thể đánh bại bất kỳ kẻ thù nào chỉ bằng một cú đấm duy nhất. Anh luôn tìm kiếm một đối thủ xứng tầm để tìm lại cảm giác phấn khích khi chiến đấu.",
                    CoverUrl = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
                    Type = MangaType.Manga,
                    Status = MangaStatus.Ongoing,
                    Demographic = MangaDemographic.Shounen,
                    Format = MangaFormat.Adaptation,
                    ReleaseYear = 2012,
                    CreatedAt = DateTime.UtcNow.AddDays(-10)
                };

                context.Mangas.Add(opm);
                context.SaveChanges();

                context.MangaAuthors.AddRange(
                    new MangaAuthor { MangaId = opm.Id, AuthorId = authorsMap["ONE"].Id, Role = "Story (Kịch bản)" },
                    new MangaAuthor { MangaId = opm.Id, AuthorId = authorsMap["Yusuke Murata"].Id, Role = "Art (Họa sĩ vẽ)" }
                );

                context.MangaGenres.AddRange(
                    new MangaGenre { MangaId = opm.Id, GenreId = genresMap["hanh-dong"].Id },
                    new MangaGenre { MangaId = opm.Id, GenreId = genresMap["hai-huoc"].Id },
                    new MangaGenre { MangaId = opm.Id, GenreId = genresMap["vien-tuong"].Id }
                );

                context.MangaThemes.AddRange(
                    new MangaTheme { MangaId = opm.Id, ThemeId = themesMap["monsters"].Id }
                );

                var opmC1 = new Chapter { MangaId = opm.Id, ChapterNumber = 1, Title = "Cú Đấm Hủy Diệt", UploadedAt = DateTime.UtcNow.AddDays(-5) };
                var opmC2 = new Chapter { MangaId = opm.Id, ChapterNumber = 2, Title = "Sức Mạnh Vô Song", UploadedAt = DateTime.UtcNow.AddDays(-4) };
                context.Chapters.AddRange(opmC1, opmC2);
                context.SaveChanges();

                context.Pages.AddRange(
                    new Page { ChapterId = opmC1.Id, PageNumber = 1, ImageUrl = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = opmC1.Id, PageNumber = 2, ImageUrl = "https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = opmC1.Id, PageNumber = 3, ImageUrl = "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = opmC1.Id, PageNumber = 4, ImageUrl = "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = opmC1.Id, PageNumber = 5, ImageUrl = "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800&auto=format&fit=crop&q=80" }
                );
                context.Pages.AddRange(
                    new Page { ChapterId = opmC2.Id, PageNumber = 1, ImageUrl = "https://images.unsplash.com/photo-1601049676099-e7ed07d825b0?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = opmC2.Id, PageNumber = 2, ImageUrl = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = opmC2.Id, PageNumber = 3, ImageUrl = "https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = opmC2.Id, PageNumber = 4, ImageUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = opmC2.Id, PageNumber = 5, ImageUrl = "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&auto=format&fit=crop&q=80" }
                );
                context.SaveChanges();
            }

            if (!context.Mangas.Any(m => m.Title == "Solo Leveling"))
            {
                var sl = new Manga
                {
                    Title = "Solo Leveling",
                    AlternativeTitle = "Tôi Thăng Cấp Một Mình",
                    Description = "Trong thế giới nơi xuất hiện những 'Cổng' kết nối thế giới ngầm với loài người, thợ săn là những người mang sức mạnh đặc biệt để chiến đấu. Sung Jin-Woo - một thợ săn hạng E yếu đuối nhất thế giới, bất ngờ nhận được hệ thống tăng cấp bí ẩn sau khi suýt chết ở một hầm ngục kép.",
                    CoverUrl = "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
                    Type = MangaType.Manhwa,
                    Status = MangaStatus.Completed,
                    Demographic = MangaDemographic.Shounen,
                    Format = MangaFormat.Adaptation,
                    ReleaseYear = 2018,
                    CreatedAt = DateTime.UtcNow.AddDays(-9)
                };

                context.Mangas.Add(sl);
                context.SaveChanges();

                context.MangaAuthors.AddRange(
                    new MangaAuthor { MangaId = sl.Id, AuthorId = authorsMap["Chugong"].Id, Role = "Story (Nguyên tác)" },
                    new MangaAuthor { MangaId = sl.Id, AuthorId = authorsMap["DUBU (Redice Studio)"].Id, Role = "Art (Họa sĩ vẽ)" }
                );

                context.MangaGenres.AddRange(
                    new MangaGenre { MangaId = sl.Id, GenreId = genresMap["hanh-dong"].Id },
                    new MangaGenre { MangaId = sl.Id, GenreId = genresMap["ky-ao"].Id },
                    new MangaGenre { MangaId = sl.Id, GenreId = genresMap["phieu-luu"].Id }
                );

                context.MangaThemes.AddRange(
                    new MangaTheme { MangaId = sl.Id, ThemeId = themesMap["magic"].Id },
                    new MangaTheme { MangaId = sl.Id, ThemeId = themesMap["survival"].Id }
                );

                var slC1 = new Chapter { MangaId = sl.Id, ChapterNumber = 1, Title = "Hầm Ngục Cép Cực Kỳ Nguy Hiểm", UploadedAt = DateTime.UtcNow.AddDays(-8) };
                var slC2 = new Chapter { MangaId = sl.Id, ChapterNumber = 2, Title = "Thử Thách Cuối Cùng", UploadedAt = DateTime.UtcNow.AddDays(-7) };
                context.Chapters.AddRange(slC1, slC2);
                context.SaveChanges();

                context.Pages.AddRange(
                    new Page { ChapterId = slC1.Id, PageNumber = 1, ImageUrl = "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = slC1.Id, PageNumber = 2, ImageUrl = "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = slC1.Id, PageNumber = 3, ImageUrl = "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = slC1.Id, PageNumber = 4, ImageUrl = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = slC1.Id, PageNumber = 5, ImageUrl = "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80" }
                );
                context.Pages.AddRange(
                    new Page { ChapterId = slC2.Id, PageNumber = 1, ImageUrl = "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = slC2.Id, PageNumber = 2, ImageUrl = "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = slC2.Id, PageNumber = 3, ImageUrl = "https://images.unsplash.com/photo-1552083375-1447ce886485?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = slC2.Id, PageNumber = 4, ImageUrl = "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = slC2.Id, PageNumber = 5, ImageUrl = "https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?w=800&auto=format&fit=crop&q=80" }
                );
                context.SaveChanges();
            }

            if (!context.Mangas.Any(m => m.Title == "Võ Luyện Đỉnh Phong"))
            {
                var mp = new Manga
                {
                    Title = "Võ Luyện Đỉnh Phong",
                    AlternativeTitle = "Martial Peak",
                    Description = "Võ đạo đỉnh phong, là cô độc, là tịch mịch, là nghịch cảnh đi lên, là không khuất phục. Dương Khai - một đệ tử quét rác của Lăng Tiêu Các, bất ngờ có được một cuốn Hắc Thư thần bí, mở ra con đường bước lên đỉnh phong của võ học đầy chông gai và thử thách.",
                    CoverUrl = "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=600&auto=format&fit=crop&q=80",
                    Type = MangaType.Manhua,
                    Status = MangaStatus.Ongoing,
                    Demographic = MangaDemographic.Shounen,
                    Format = MangaFormat.Adaptation,
                    ReleaseYear = 2018,
                    CreatedAt = DateTime.UtcNow.AddDays(-8)
                };

                context.Mangas.Add(mp);
                context.SaveChanges();

                context.MangaAuthors.AddRange(
                    new MangaAuthor { MangaId = mp.Id, AuthorId = authorsMap["Mạc Mặc"].Id, Role = "Story (Nguyên tác)" },
                    new MangaAuthor { MangaId = mp.Id, AuthorId = authorsMap["Pikapi"].Id, Role = "Art (Họa sĩ vẽ)" }
                );

                context.MangaGenres.AddRange(
                    new MangaGenre { MangaId = mp.Id, GenreId = genresMap["hanh-dong"].Id },
                    new MangaGenre { MangaId = mp.Id, GenreId = genresMap["vo-thuat"].Id },
                    new MangaGenre { MangaId = mp.Id, GenreId = genresMap["ky-ao"].Id }
                );

                context.MangaThemes.AddRange(
                    new MangaTheme { MangaId = mp.Id, ThemeId = themesMap["magic"].Id },
                    new MangaTheme { MangaId = mp.Id, ThemeId = themesMap["harem"].Id }
                );

                var mpC1 = new Chapter { MangaId = mp.Id, ChapterNumber = 1, Title = "Đệ Tử Quét Rác", UploadedAt = DateTime.UtcNow.AddDays(-6) };
                var mpC2 = new Chapter { MangaId = mp.Id, ChapterNumber = 2, Title = "Hắc Thư Thần Bí", UploadedAt = DateTime.UtcNow.AddDays(-5) };
                context.Chapters.AddRange(mpC1, mpC2);
                context.SaveChanges();

                context.Pages.AddRange(
                    new Page { ChapterId = mpC1.Id, PageNumber = 1, ImageUrl = "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = mpC1.Id, PageNumber = 2, ImageUrl = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = mpC1.Id, PageNumber = 3, ImageUrl = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = mpC1.Id, PageNumber = 4, ImageUrl = "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = mpC1.Id, PageNumber = 5, ImageUrl = "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&auto=format&fit=crop&q=80" }
                );
                context.Pages.AddRange(
                    new Page { ChapterId = mpC2.Id, PageNumber = 1, ImageUrl = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = mpC2.Id, PageNumber = 2, ImageUrl = "https://images.unsplash.com/photo-1472214222541-d510753a4907?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = mpC2.Id, PageNumber = 3, ImageUrl = "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = mpC2.Id, PageNumber = 4, ImageUrl = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop&q=80" },
                    new Page { ChapterId = mpC2.Id, PageNumber = 5, ImageUrl = "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80" }
                );
                context.SaveChanges();
            }

            if (!context.Users.Any())
            {
                var users = new List<User>();
                var adminPassword = configuration["SeedUsers:AdminPassword"];
                var demoPassword = configuration["SeedUsers:DemoPassword"];

                if (!string.IsNullOrWhiteSpace(adminPassword))
                {
                    users.Add(new User
                    {
                        Username = "admin",
                        PasswordHash = AuthService.HashPassword(adminPassword),
                        Email = "admin@manganpk.com",
                        Role = "Admin",
                        CreatedAt = DateTime.UtcNow.AddDays(-30)
                    });
                }

                if (!string.IsNullOrWhiteSpace(demoPassword))
                {
                    users.Add(new User
                    {
                        Username = "demo",
                        PasswordHash = AuthService.HashPassword(demoPassword),
                        Email = "demo@manganpk.com",
                        Role = "User",
                        CreatedAt = DateTime.UtcNow.AddDays(-20)
                    });
                }

                if (users.Count > 0)
                {
                    context.Users.AddRange(users);
                    context.SaveChanges();
                }
            }

            if (context.Users.Any() && !context.MangaLists.Any())
            {
                var demoUser = context.Users.FirstOrDefault(u => u.Username == "demo");
                var mangas = context.Mangas.ToList();
                if (demoUser != null && mangas.Count > 0)
                {
                    var readList = new MangaList
                    {
                        UserId = demoUser.Id,
                        Name = "Đang đọc",
                        Description = "Truyện đang theo dõi gần đây",
                        IsPublic = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-10)
                    };
                    context.MangaLists.Add(readList);
                    context.SaveChanges();

                    var planList = new MangaList
                    {
                        UserId = demoUser.Id,
                        Name = "Kế hoạch đọc",
                        Description = "Danh sách muốn đọc sau",
                        IsPublic = false,
                        CreatedAt = DateTime.UtcNow.AddDays(-7)
                    };
                    context.MangaLists.Add(planList);
                    context.SaveChanges();

                    var sl = mangas.FirstOrDefault(m => m.Title == "Solo Leveling");
                    if (sl != null)
                    {
                        context.MangaListItems.Add(new MangaListItem
                        {
                            ListId = readList.Id,
                            MangaId = sl.Id,
                            Order = 1,
                            AddedAt = DateTime.UtcNow.AddDays(-5)
                        });
                    }

                    var opm = mangas.FirstOrDefault(m => m.Title == "One Punch Man");
                    if (opm != null)
                    {
                        context.MangaListItems.Add(new MangaListItem
                        {
                            ListId = readList.Id,
                            MangaId = opm.Id,
                            Order = 2,
                            AddedAt = DateTime.UtcNow.AddDays(-3)
                        });
                    }

                    var mp = mangas.FirstOrDefault(m => m.Title == "Võ Luyện Đỉnh Phong");
                    if (mp != null)
                    {
                        context.MangaListItems.Add(new MangaListItem
                        {
                            ListId = planList.Id,
                            MangaId = mp.Id,
                            Order = 1,
                            AddedAt = DateTime.UtcNow.AddDays(-1)
                        });
                    }

                    context.SaveChanges();
                }
            }

            var existingMangas = context.Mangas.ToList();
            var opmExisting = existingMangas.FirstOrDefault(m => m.Title == "One Punch Man");
            if (opmExisting != null && (opmExisting.Demographic == MangaDemographic.None || opmExisting.Format == MangaFormat.None))
            {
                opmExisting.Demographic = MangaDemographic.Shounen;
                opmExisting.Format = MangaFormat.Adaptation;
            }
            var slExisting = existingMangas.FirstOrDefault(m => m.Title == "Solo Leveling");
            if (slExisting != null && (slExisting.Demographic == MangaDemographic.None || slExisting.Format == MangaFormat.None))
            {
                slExisting.Demographic = MangaDemographic.Shounen;
                slExisting.Format = MangaFormat.Adaptation;
            }
            var mpExisting = existingMangas.FirstOrDefault(m => m.Title == "Võ Luyện Đỉnh Phong");
            if (mpExisting != null && (mpExisting.Demographic == MangaDemographic.None || mpExisting.Format == MangaFormat.None))
            {
                mpExisting.Demographic = MangaDemographic.Shounen;
                mpExisting.Format = MangaFormat.Adaptation;
            }
            context.SaveChanges();
        }

        private static void EnsureMangaDexTaxonomy(MangaDbContext context)
        {
            string[] genreNames =
            [
                "Action", "Adventure", "Boys' Love", "Comedy", "Crime", "Drama", "Fantasy",
                "Girls' Love", "Historical", "Horror", "Isekai", "Magical Girls", "Mecha", "Medical",
                "Mystery", "Philosophical", "Psychological", "Romance", "Sci-Fi", "Slice of Life",
                "Sports", "Superhero", "Thriller", "Tragedy", "Wuxia"
            ];
            string[] themeNames =
            [
                "Aliens", "Animals", "Cooking", "Crossdressing", "Delinquents", "Demons", "Genderswap",
                "Ghosts", "Gyaru", "Harem", "Incest", "Loli", "Mafia", "Magic", "Mahjong", "Martial Arts",
                "Military", "Monster Girls", "Monsters", "Music", "Ninja", "Office Workers", "Police",
                "Post-Apocalyptic", "Reincarnation", "Reverse Harem", "Samurai", "School Life", "Shota",
                "Supernatural", "Survival", "Time Travel", "Traditional Games", "Vampires", "Video Games",
                "Villainess", "Virtual Reality", "Zombies"
            ];

            var existingGenres = context.Genres.Select(item => item.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            context.Genres.AddRange(genreNames
                .Where(name => !existingGenres.Contains(name))
                .Select(name => new Genre { Name = name, Slug = ToTaxonomySlug(name) }));

            var existingThemes = context.Themes.Select(item => item.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            context.Themes.AddRange(themeNames
                .Where(name => !existingThemes.Contains(name))
                .Select(name => new Theme { Name = name, Slug = ToTaxonomySlug(name) }));
            context.SaveChanges();
        }

        private static string ToTaxonomySlug(string value)
        {
            return value.ToLowerInvariant()
                .Replace("'", string.Empty)
                .Replace(" ", "-");
        }
    }
}
