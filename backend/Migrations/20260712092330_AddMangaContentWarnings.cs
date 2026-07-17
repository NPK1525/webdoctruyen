using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MangaNPK.Migrations
{
    /// <inheritdoc />
    public partial class AddMangaContentWarnings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentWarnings",
                table: "Mangas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContentWarnings",
                table: "Mangas");
        }
    }
}
