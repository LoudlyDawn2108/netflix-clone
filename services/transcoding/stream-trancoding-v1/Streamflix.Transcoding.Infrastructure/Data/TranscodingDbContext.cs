using Microsoft.EntityFrameworkCore;
using Streamflix.Transcoding.Core.Entities;

namespace Streamflix.Transcoding.Infrastructure.Data;

public class TranscodingDbContext : DbContext
{
    public TranscodingDbContext(DbContextOptions<TranscodingDbContext> options) : base(options)
    {
    }
    
    public DbSet<TranscodingJob> TranscodingJobs { get; set; } = null!;
    public DbSet<Rendition> Renditions { get; set; } = null!;
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure TranscodingJob entity
        modelBuilder.Entity<TranscodingJob>(entity =>
        {
            entity.ToTable("transcoding_jobs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.VideoId).IsRequired();
            entity.Property(e => e.InputFileS3Path).IsRequired().HasMaxLength(1024);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.RetryCount).HasDefaultValue(0);
            entity.Property(e => e.TenantId).HasMaxLength(256).IsRequired();
            entity.Property(e => e.ErrorMessage).HasMaxLength(2048);
            entity.Property(e => e.OutputManifestS3Path).HasMaxLength(1024);
            
            // Create index on VideoId and TenantId for uniqueness check
            entity.HasIndex(e => new { e.VideoId, e.TenantId })
                .IsUnique()
                .HasDatabaseName("IX_TranscodingJobs_VideoId_TenantId");
                
            // Create index on Status for efficient querying
            entity.HasIndex(e => e.Status)
                .HasDatabaseName("IX_TranscodingJobs_Status");
        });
        
        // Configure Rendition entity
        modelBuilder.Entity<Rendition>(entity =>
        {
            entity.ToTable("renditions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.Resolution).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Bitrate).IsRequired();
            entity.Property(e => e.OutputPath).IsRequired().HasMaxLength(1024);
            entity.Property(e => e.Status).IsRequired();
            
            // Configure relationship with TranscodingJob
            entity.HasOne(e => e.TranscodingJob)
                .WithMany(r => r.Renditions)
                .HasForeignKey(e => e.TranscodingJobId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Create index on TranscodingJobId for efficient querying
            entity.HasIndex(e => e.TranscodingJobId)
                .HasDatabaseName("IX_Renditions_TranscodingJobId");
        });
        
        base.OnModelCreating(modelBuilder);
    }
}
