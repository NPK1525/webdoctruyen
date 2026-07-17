using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MangaNPK.Migrations
{
    /// <inheritdoc />
    public partial class AddTitleDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TitleDrafts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OriginalTitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EnglishTitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AlternativeTitlesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OriginalLanguage = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ReleaseYear = table.Column<int>(type: "int", nullable: true),
                    StoryAuthor = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Artist = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Publisher = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GenreIdsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ThemeIdsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Demographic = table.Column<int>(type: "int", nullable: false),
                    AgeRating = table.Column<int>(type: "int", nullable: false),
                    CoverUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BannerUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OfficialWebsite = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReferenceUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TrackingUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DataSource = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    MangaDexId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ScanlationGroup = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TranslationLanguage = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReviewStatus = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedByUserId = table.Column<int>(type: "int", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ApprovedMangaId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TitleDrafts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TitleDrafts_Mangas_ApprovedMangaId",
                        column: x => x.ApprovedMangaId,
                        principalTable: "Mangas",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TitleDrafts_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TitleDrafts_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_TitleDrafts_ApprovedMangaId",
                table: "TitleDrafts",
                column: "ApprovedMangaId");

            migrationBuilder.CreateIndex(
                name: "IX_TitleDrafts_CreatedByUserId",
                table: "TitleDrafts",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TitleDrafts_ReviewedByUserId",
                table: "TitleDrafts",
                column: "ReviewedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TitleDrafts");
        }
    }
}
