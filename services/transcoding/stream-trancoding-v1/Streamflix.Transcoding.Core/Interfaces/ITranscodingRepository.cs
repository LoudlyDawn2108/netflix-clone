using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Models; // Added for TranscodingJobStatus

namespace Streamflix.Transcoding.Core.Interfaces;

public interface ITranscodingRepository
{
    // Job operations
    Task<TranscodingJob> CreateJobAsync(TranscodingJob job);
    Task<TranscodingJob?> GetJobByIdAsync(Guid id);
    // Modified to include tenantId for idempotency
    Task<TranscodingJob?> GetJobByVideoIdAsync(Guid videoId, string tenantId);
    // Updated to use TranscodingJobStatus
    Task<IEnumerable<TranscodingJob>> GetJobsByStatusAsync(TranscodingJobStatus status, int limit = 100);
    Task<IEnumerable<TranscodingJob>> GetJobsAsync();
    Task<TranscodingJob> UpdateJobAsync(TranscodingJob job);
    // Updated to use TranscodingJobStatus
    Task<bool> UpdateJobStatusAsync(Guid id, TranscodingJobStatus status, string? errorMessage = null);
    
    // Rendition operations
    Task<Rendition> CreateRenditionAsync(Rendition rendition);
    Task<IEnumerable<Rendition>> GetRenditionsForJobAsync(Guid jobId);
    Task<Rendition> UpdateRenditionAsync(Rendition rendition);
    Task<bool> UpdateRenditionStatusAsync(Guid id, RenditionStatus status);
    // Add multiple renditions for a job
    Task<IEnumerable<Rendition>> AddRenditionsAsync(IEnumerable<Rendition> renditions);
    
    // Transaction support
    Task<bool> SaveChangesAsync();
}
