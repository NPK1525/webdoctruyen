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
        public DbSet<UserMangaLibrary> UserMangaLibraries { get; set; } = null!;
        public DbSet<Comment> Comments { get; set; } = null!;
        public DbSet<Rating> Ratings { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<MangaList> MangaLists { get; set; } = null!;
        public DbSet<MangaListItem> MangaListItems { get; set; } = null!;
        public DbSet<TitleDraft> TitleDrafts { get; set; } = null!;
        public DbSet<MangaContributor> MangaContributors { get; set; } = null!;
        public DbSet<TitleDraftAuthor> TitleDraftAuthors { get; set; } = null!;
        public DbSet<Report> Reports { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.Reporter)
                .WithMany()
                .HasForeignKey(r => r.ReporterId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.ResolvedByUser)
                .WithMany()
                .HasForeignKey(r => r.ResolvedByUserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.Manga)
                .WithMany()
                .HasForeignKey(r => r.MangaId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.Chapter)
                .WithMany()
                .HasForeignKey(r => r.ChapterId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Report>()
                .HasIndex(r => new { r.ReporterId, r.TargetType, r.MangaId, r.ChapterId, r.Reason, r.Status });

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

            modelBuilder.Entity<Manga>()
                .Property(m => m.Source)
                .HasMaxLength(40);

            modelBuilder.Entity<Manga>()
                .Property(m => m.ExternalId)
                .HasMaxLength(80);

            modelBuilder.Entity<TitleDraft>()
                .Property(d => d.DataSource)
                .HasMaxLength(40);

            modelBuilder.Entity<TitleDraft>()
                .Property(d => d.MangaDexId)
                .HasMaxLength(80);

            modelBuilder.Entity<TitleDraft>()
                .Property(d => d.TranslationLanguage)
                .HasMaxLength(10);

            modelBuilder.Entity<TitleDraft>()
                .Property(d => d.ContentWarnings)
                .HasMaxLength(500);

            modelBuilder.Entity<TitleDraft>()
                .HasOne(d => d.CreatedByUser)
                .WithMany()
                .HasForeignKey(d => d.CreatedByUserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<TitleDraft>()
                .HasOne(d => d.ReviewedByUser)
                .WithMany()
                .HasForeignKey(d => d.ReviewedByUserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<TitleDraft>()
                .HasOne(d => d.ApprovedManga)
                .WithMany()
                .HasForeignKey(d => d.ApprovedMangaId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<MangaContributor>()
                .HasKey(mc => new { mc.MangaId, mc.UserId });

            modelBuilder.Entity<MangaContributor>()
                .HasIndex(mc => new { mc.MangaId, mc.UserId })
                .IsUnique();

            modelBuilder.Entity<MangaContributor>()
                .HasOne(mc => mc.Manga)
                .WithMany(m => m.Contributors)
                .HasForeignKey(mc => mc.MangaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MangaContributor>()
                .HasOne(mc => mc.User)
                .WithMany(u => u.MangaContributions)
                .HasForeignKey(mc => mc.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MangaContributor>()
                .HasOne(mc => mc.GrantedByUser)
                .WithMany()
                .HasForeignKey(mc => mc.GrantedByUserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<TitleDraftAuthor>()
                .HasOne(da => da.TitleDraft)
                .WithMany(d => d.Authors)
                .HasForeignKey(da => da.TitleDraftId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TitleDraftAuthor>()
                .HasOne(da => da.Author)
                .WithMany()
                .HasForeignKey(da => da.AuthorId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<TitleDraftAuthor>()
                .Property(da => da.ProposedName)
                .HasMaxLength(200);

            modelBuilder.Entity<TitleDraftAuthor>()
                .Property(da => da.Role)
                .HasMaxLength(40);

            modelBuilder.Entity<Chapter>()
                .Property(c => c.Source)
                .HasMaxLength(40);

            modelBuilder.Entity<Chapter>()
                .Property(c => c.ExternalId)
                .HasMaxLength(80);

            modelBuilder.Entity<Chapter>()
                .Property(c => c.TranslatedLanguage)
                .HasMaxLength(10);

            modelBuilder.Entity<Chapter>()
                .Property(c => c.ScanlationGroupName)
                .HasMaxLength(300);

            modelBuilder.Entity<Manga>()
                .HasIndex(m => new { m.Source, m.ExternalId })
                .IsUnique()
                .HasFilter("[ExternalId] <> ''");

            modelBuilder.Entity<Chapter>()
                .HasIndex(c => new { c.Source, c.ExternalId })
                .IsUnique()
                .HasFilter("[ExternalId] <> ''");

            modelBuilder.Entity<Chapter>()
                .HasIndex(c => new { c.MangaId, c.ChapterNumber })
                .IsUnique()
                .HasFilter("[Source] = 'Local'");

            // Configure Page relationship
            modelBuilder.Entity<Page>()
                .HasOne(p => p.Chapter)
                .WithMany(c => c.Pages)
                .HasForeignKey(p => p.ChapterId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserMangaLibrary>()
                .HasKey(uml => new { uml.UserId, uml.MangaId });

            modelBuilder.Entity<UserMangaLibrary>()
                .HasOne(uml => uml.User)
                .WithMany()
                .HasForeignKey(uml => uml.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserMangaLibrary>()
                .HasOne(uml => uml.Manga)
                .WithMany()
                .HasForeignKey(uml => uml.MangaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserMangaLibrary>()
                .HasOne(uml => uml.LastChapter)
                .WithMany()
                .HasForeignKey(uml => uml.LastChapterId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure Comment relationships
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Manga)
                .WithMany()
                .HasForeignKey(c => c.MangaId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Chapter)
                .WithMany()
                .HasForeignKey(c => c.ChapterId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure Rating relationships
            modelBuilder.Entity<Rating>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Rating>()
                .HasOne(r => r.Manga)
                .WithMany()
                .HasForeignKey(r => r.MangaId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure MangaList relationships
            modelBuilder.Entity<MangaList>()
                .HasOne(ml => ml.User)
                .WithMany()
                .HasForeignKey(ml => ml.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MangaListItem>()
                .HasKey(mli => new { mli.ListId, mli.MangaId });

            modelBuilder.Entity<MangaListItem>()
                .HasOne(mli => mli.List)
                .WithMany(l => l.Items)
                .HasForeignKey(mli => mli.ListId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MangaListItem>()
                .HasOne(mli => mli.Manga)
                .WithMany()
                .HasForeignKey(mli => mli.MangaId)
                .OnDelete(DeleteBehavior.NoAction);

            // Configure Notification relationships
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
