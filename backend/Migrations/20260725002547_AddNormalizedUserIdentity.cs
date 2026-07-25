using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MangaNPK.Migrations
{
    /// <inheritdoc />
    public partial class AddNormalizedUserIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NormalizedEmail",
                table: "Users",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NormalizedUsername",
                table: "Users",
                type: "nvarchar(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE [Users]
                SET [NormalizedUsername] = UPPER(LTRIM(RTRIM(ISNULL([Username], '')))),
                    [NormalizedEmail] = UPPER(LTRIM(RTRIM(ISNULL([Email], ''))));

                IF EXISTS (
                    SELECT [NormalizedUsername]
                    FROM [Users]
                    GROUP BY [NormalizedUsername]
                    HAVING COUNT(*) > 1
                )
                BEGIN
                    THROW 50001, 'Cannot create unique username index: duplicate normalized usernames exist.', 1;
                END;

                IF EXISTS (
                    SELECT [NormalizedEmail]
                    FROM [Users]
                    GROUP BY [NormalizedEmail]
                    HAVING COUNT(*) > 1
                )
                BEGIN
                    THROW 50002, 'Cannot create unique email index: duplicate normalized emails exist.', 1;
                END;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Users_NormalizedEmail",
                table: "Users",
                column: "NormalizedEmail",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_NormalizedUsername",
                table: "Users",
                column: "NormalizedUsername",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_NormalizedEmail",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_NormalizedUsername",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NormalizedEmail",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NormalizedUsername",
                table: "Users");
        }
    }
}
