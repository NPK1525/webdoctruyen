using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MangaNPK.Migrations
{
    /// <inheritdoc />
    public partial class AddMangaDexImportFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Mangas",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Mangas",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Local");

            migrationBuilder.AddColumn<DateTime>(
                name: "SyncedAt",
                table: "Mangas",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Chapters",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                table: "Chapters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ScanlationGroupName",
                table: "Chapters",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Chapters",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Local");

            migrationBuilder.AddColumn<DateTime>(
                name: "SyncedAt",
                table: "Chapters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TranslatedLanguage",
                table: "Chapters",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "vi");

            migrationBuilder.CreateIndex(
                name: "IX_Mangas_Source_ExternalId",
                table: "Mangas",
                columns: new[] { "Source", "ExternalId" },
                unique: true,
                filter: "[ExternalId] <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_Chapters_Source_ExternalId",
                table: "Chapters",
                columns: new[] { "Source", "ExternalId" },
                unique: true,
                filter: "[ExternalId] <> ''");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Mangas_Source_ExternalId",
                table: "Mangas");

            migrationBuilder.DropIndex(
                name: "IX_Chapters_Source_ExternalId",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Mangas");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Mangas");

            migrationBuilder.DropColumn(
                name: "SyncedAt",
                table: "Mangas");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "ScanlationGroupName",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "SyncedAt",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "TranslatedLanguage",
                table: "Chapters");
        }
    }
}
