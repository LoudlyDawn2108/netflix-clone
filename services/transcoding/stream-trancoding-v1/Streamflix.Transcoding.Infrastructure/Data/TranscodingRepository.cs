using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;

namespace Streamflix.Transcoding.Infrastructure.Data;

public class TranscodingRepository : ITranscodingRepository
{
    private readonly TranscodingDbContext _dbContext;
    private readonly ILogger<TranscodingRepository> _logger;

    public TranscodingRepository(TranscodingDbContext dbContext, ILogger<TranscodingRepository> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region Job Operations
    
    public async Task<TranscodingJob> CreateJobAsync(TranscodingJob job)
    {
        try
        {
            // Check for existing job with same VideoId and TenantId for idempotency
            var existingJob = await _dbContext.TranscodingJobs
                .FirstOrDefaultAsync(j => j.VideoId == job.VideoId && j.TenantId == job.TenantId);
                
            if (existingJob != null)
            {
                _logger.LogInformation("Job for video {VideoId} and tenant {TenantId} already exists with ID {JobId}", 
                    job.VideoId, job.TenantId, existingJob.Id);
                return existingJob;
            }
            
            // Set creation timestamp and ensure Id is set
            if (job.Id == Guid.Empty)
            {
                job.Id = Guid.NewGuid();
            }
            
            job.CreatedAt = DateTime.UtcNow;
            job.UpdatedAt = DateTime.UtcNow;
            job.Status = TranscodingJobStatus.Received;

            await _dbContext.TranscodingJobs.AddAsync(job);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Created new transcoding job with ID {JobId} for video {VideoId}", job.Id, job.VideoId);
            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create transcoding job for video {VideoId}", job.VideoId);
            throw;
        }
    }

    public async Task<TranscodingJob?> GetJobByIdAsync(Guid id)
    {
        try
        {
            return await _dbContext.TranscodingJobs
                .FirstOrDefaultAsync(j => j.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve transcoding job with ID {JobId}", id);
            throw;
        }
    }

    public async Task<TranscodingJob?> GetJobByVideoIdAsync(Guid videoId, string tenantId)
    {
        try
        {
            return await _dbContext.TranscodingJobs
                .FirstOrDefaultAsync(j => j.VideoId == videoId && j.TenantId == tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve transcoding job for video {VideoId} and tenant {TenantId}", videoId, tenantId);
            throw;
        }
    }

    public async Task<IEnumerable<TranscodingJob>> GetJobsByStatusAsync(TranscodingJobStatus status, int limit = 100)
    {
        try
        {
            return await _dbContext.TranscodingJobs
                .Where(j => j.Status == status)
                .OrderBy(j => j.CreatedAt)
                .Take(limit)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve transcoding jobs with status {Status}", status);
            throw;
        }
    }
    
    public async Task<IEnumerable<TranscodingJob>> GetJobsAsync()
    {
        try
        {
            return await _dbContext.TranscodingJobs
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve all transcoding jobs");
            throw;
        }
    }

    public async Task<TranscodingJob> UpdateJobAsync(TranscodingJob job)
    {
        try
        {
            job.UpdatedAt = DateTime.UtcNow;
            _dbContext.TranscodingJobs.Update(job);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Updated transcoding job with ID {JobId}", job.Id);
            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update transcoding job with ID {JobId}", job.Id);
            throw;
        }
    }

    public async Task<bool> UpdateJobStatusAsync(Guid id, TranscodingJobStatus status, string? errorMessage = null)
    {
        try
        {
            var job = await _dbContext.TranscodingJobs.FindAsync(id);
            if (job == null)
            {
                _logger.LogWarning("Cannot update status: Transcoding job with ID {JobId} not found", id);
                return false;
            }

            job.Status = status;
            job.UpdatedAt = DateTime.UtcNow;
            
            // Update error message if provided
            if (!string.IsNullOrEmpty(errorMessage) && status == TranscodingJobStatus.Failed)
            {
                job.ErrorMessage = errorMessage;
                job.RetryCount += 1;
            }

            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Updated transcoding job {JobId} status to {Status}", id, status);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update status for transcoding job with ID {JobId}", id);
            throw;
        }
    }
    
    #endregion
    
    #region Rendition Operations
    
    public async Task<Rendition> CreateRenditionAsync(Rendition rendition)
    {
        try
        {
            if (rendition.Id == Guid.Empty)
            {
                rendition.Id = Guid.NewGuid();
            }
            
            rendition.CreatedAt = DateTime.UtcNow;
            rendition.Status = RenditionStatus.Pending;
            
            await _dbContext.Renditions.AddAsync(rendition);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Created new rendition with ID {RenditionId} for job {JobId}", 
                rendition.Id, rendition.TranscodingJobId);
                
            return rendition;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create rendition for job {JobId}", rendition.TranscodingJobId);
            throw;
        }
    }

    public async Task<IEnumerable<Rendition>> GetRenditionsForJobAsync(Guid jobId)
    {
        try
        {
            return await _dbContext.Renditions
                .Where(r => r.TranscodingJobId == jobId)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve renditions for job {JobId}", jobId);
            throw;
        }
    }

    public async Task<Rendition> UpdateRenditionAsync(Rendition rendition)
    {
        try
        {
            _dbContext.Renditions.Update(rendition);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Updated rendition with ID {RenditionId}", rendition.Id);
            return rendition;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update rendition with ID {RenditionId}", rendition.Id);
            throw;
        }
    }

    public async Task<bool> UpdateRenditionStatusAsync(Guid id, RenditionStatus status)
    {
        try
        {
            var rendition = await _dbContext.Renditions.FindAsync(id);
            if (rendition == null)
            {
                _logger.LogWarning("Cannot update status: Rendition with ID {RenditionId} not found", id);
                return false;
            }

            rendition.Status = status;
            
            // Update completed timestamp if status is final
            if (status == RenditionStatus.Completed || status == RenditionStatus.Failed)
            {
                rendition.CompletedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Updated rendition {RenditionId} status to {Status}", id, status);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update status for rendition with ID {RenditionId}", id);
            throw;
        }
    }

    public async Task<IEnumerable<Rendition>> AddRenditionsAsync(IEnumerable<Rendition> renditions)
    {
        try
        {
            var now = DateTime.UtcNow;
            foreach (var rendition in renditions)
            {
                if (rendition.Id == Guid.Empty)
                {
                    rendition.Id = Guid.NewGuid();
                }
                
                rendition.CreatedAt = now;
                rendition.Status = RenditionStatus.Pending;
            }
            
            await _dbContext.Renditions.AddRangeAsync(renditions);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Added {Count} renditions to the database", renditions.Count());
            return renditions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add renditions to the database");
            throw;
        }
    }
    
    #endregion
    
    public async Task<bool> SaveChangesAsync()
    {
        try
        {
            return await _dbContext.SaveChangesAsync() > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving changes to the database");
            throw;
        }
    }
}
