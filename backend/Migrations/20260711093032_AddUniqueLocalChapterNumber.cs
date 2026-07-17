using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MangaNPK.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueLocalChapterNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Chapters_MangaId",
                table: "Chapters");

            migrationBuilder.CreateIndex(
                name: "IX_Chapters_MangaId_ChapterNumber",
                table: "Chapters",
                columns: new[] { "MangaId", "ChapterNumber" },
                unique: true,
                filter: "[Source] = 'Local'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Chapters_MangaId_ChapterNumber",
                table: "Chapters");

            migrationBuilder.CreateIndex(
                name: "IX_Chapters_MangaId",
                table: "Chapters",
                column: "MangaId");
        }
    }
}
