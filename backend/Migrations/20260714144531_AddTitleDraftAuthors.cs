using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MangaNPK.Migrations
{
    /// <inheritdoc />
    public partial class AddTitleDraftAuthors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TitleDraftAuthors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TitleDraftId = table.Column<int>(type: "int", nullable: false),
                    AuthorId = table.Column<int>(type: "int", nullable: true),
                    ProposedName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TitleDraftAuthors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TitleDraftAuthors_Authors_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Authors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TitleDraftAuthors_TitleDrafts_TitleDraftId",
                        column: x => x.TitleDraftId,
                        principalTable: "TitleDrafts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TitleDraftAuthors_AuthorId",
                table: "TitleDraftAuthors",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_TitleDraftAuthors_TitleDraftId",
                table: "TitleDraftAuthors",
                column: "TitleDraftId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TitleDraftAuthors");
        }
    }
}
