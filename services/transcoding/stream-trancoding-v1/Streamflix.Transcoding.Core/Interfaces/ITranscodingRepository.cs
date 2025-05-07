using Streamflix.Transcoding.Core.Entities;

namespace Streamflix.Transcoding.Core.Interfaces;

public interface ITranscodingRepository
{
    // Job operations
    Task<TranscodingJob> CreateJobAsync(TranscodingJob job);
    Task<TranscodingJob?> GetJobByIdAsync(Guid id);
    Task<TranscodingJob?> GetJobByVideoIdAsync(Guid videoId);
    Task<IEnumerable<TranscodingJob>> GetJobsByStatusAsync(JobStatus status, int limit = 100);
    Task<TranscodingJob> UpdateJobAsync(TranscodingJob job);
    Task<bool> UpdateJobStatusAsync(Guid id, JobStatus status, string? errorMessage = null);
    
    // Rendition operations 
    Task<Rendition> CreateRenditionAsync(Rendition rendition);
    Task<IEnumerable<Rendition>> GetRenditionsForJobAsync(Guid jobId);
    Task<Rendition> UpdateRenditionAsync(Rendition rendition);
    Task<bool> UpdateRenditionStatusAsync(Guid id, RenditionStatus status);
    
    // Transaction support
    Task<bool> SaveChangesAsync();
}