using MangaNPK.Models;
using Microsoft.EntityFrameworkCore;

namespace MangaNPK.Data
{
    public class MangaDbContext(DbContextOptions<MangaDbContext> options) : DbContext(options)
    {
        public DbSet<Manga> Mangas { get; set; } = null!;
        public DbSet<Author> Authors { get; set; } = null!;
        public DbSet<MangaAuthor> MangaAuthors { get; set; } = null!;
        public DbSet<Genre> Genres { get; set; } = null!;
        public DbSet<MangaGenre> MangaGenres { get; set; } = null!;
        public DbSet<Theme> Themes { get; set; } = null!;
        public DbSet<MangaTheme> MangaThemes { get; set; } = null!;
        public DbSet<Chapter> Chapters { get; set; } = null!;
        public DbSet<Page> Pages { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure MangaAuthor Many-to-Many Join Table
            modelBuilder.Entity<MangaAuthor>()
                .HasKey(ma => new { ma.MangaId, ma.AuthorId });

            modelBuilder.Entity<MangaAuthor>()
                .HasOne(ma => ma.Manga)
                .WithMany(m => m.MangaAuthors)
                .HasForeignKey(ma => ma.MangaId);

            modelBuilder.Entity<MangaAuthor>()
                .HasOne(ma => ma.Author)
                .WithMany(a => a.MangaAuthors)
                .HasForeignKey(ma => ma.AuthorId);

            // Configure MangaGenre Many-to-Many Join Table
            modelBuilder.Entity<MangaGenre>()
                .HasKey(mg => new { mg.MangaId, mg.GenreId });

            modelBuilder.Entity<MangaGenre>()
                .HasOne(mg => mg.Manga)
                .WithMany(m => m.MangaGenres)
                .HasForeignKey(mg => mg.MangaId);

            modelBuilder.Entity<MangaGenre>()
                .HasOne(mg => mg.Genre)
                .WithMany(g => g.MangaGenres)
                .HasForeignKey(mg => mg.GenreId);

            // Configure MangaTheme Many-to-Many Join Table
            modelBuilder.Entity<MangaTheme>()
                .HasKey(mt => new { mt.MangaId, mt.ThemeId });

            modelBuilder.Entity<MangaTheme>()
                .HasOne(mt => mt.Manga)
                .WithMany(m => m.MangaThemes)
                .HasForeignKey(mt => mt.MangaId);

            modelBuilder.Entity<MangaTheme>()
                .HasOne(mt => mt.Theme)
                .WithMany(t => t.MangaThemes)
                .HasForeignKey(mt => mt.ThemeId);

            // Configure Chapter relationship
            modelBuilder.Entity<Chapter>()
                .HasOne(c => c.Manga)
                .WithMany(m => m.Chapters)
                .HasForeignKey(c => c.MangaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Page relationship
            modelBuilder.Entity<Page>()
                .HasOne(p => p.Chapter)
                .WithMany(c => c.Pages)
                .HasForeignKey(p => p.ChapterId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
