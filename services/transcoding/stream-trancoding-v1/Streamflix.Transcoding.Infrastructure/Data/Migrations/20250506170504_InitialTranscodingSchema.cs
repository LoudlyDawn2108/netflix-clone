using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Streamflix.Transcoding.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialTranscodingSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "transcoding_jobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VideoId = table.Column<Guid>(type: "uuid", nullable: false),
                    InputPath = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    OutputBasePath = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    TenantId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transcoding_jobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "renditions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TranscodingJobId = table.Column<Guid>(type: "uuid", nullable: false),
                    Resolution = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Bitrate = table.Column<int>(type: "integer", nullable: false),
                    OutputPath = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_renditions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_renditions_transcoding_jobs_TranscodingJobId",
                        column: x => x.TranscodingJobId,
                        principalTable: "transcoding_jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Renditions_TranscodingJobId",
                table: "renditions",
                column: "TranscodingJobId");

            migrationBuilder.CreateIndex(
                name: "IX_TranscodingJobs_Status",
                table: "transcoding_jobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_TranscodingJobs_VideoId",
                table: "transcoding_jobs",
                column: "VideoId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "renditions");

            migrationBuilder.DropTable(
                name: "transcoding_jobs");
        }
    }
}
