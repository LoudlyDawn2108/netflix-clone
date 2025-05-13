using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Streamflix.Transcoding.API.Models;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;

namespace Streamflix.Transcoding.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TranscodingJobsController : ControllerBase
{
    private readonly ITranscodingRepository _repository;
    private readonly ITranscodingService _transcodingService;
    private readonly ILogger<TranscodingJobsController> _logger;
    
    public TranscodingJobsController(
        ITranscodingRepository repository,
        ITranscodingService transcodingService,
        ILogger<TranscodingJobsController> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _transcodingService = transcodingService ?? throw new ArgumentNullException(nameof(transcodingService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
    
    /// <summary>
    /// Gets all transcoding jobs with optional filtering
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<TranscodingJobResponse>))]
    public async Task<IActionResult> GetJobs([FromQuery] string? status, [FromQuery] Guid? videoId)
    {
        try
        {
            var jobs = await _repository.GetJobsAsync();
            
            // Apply filters if provided
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<TranscodingJobStatus>(status, true, out var jobStatus))
            {
                jobs = jobs.Where(j => j.Status == jobStatus);
            }
            
            if (videoId.HasValue)
            {
                jobs = jobs.Where(j => j.VideoId == videoId.Value);
            }
            
            var result = jobs.Select(j => new TranscodingJobResponse
            {
                Id = j.Id,
                VideoId = j.VideoId,
                Status = j.Status.ToString(),
                CreatedAt = j.CreatedAt,
                UpdatedAt = j.UpdatedAt,
                ErrorMessage = j.ErrorMessage,
                RetryCount = j.RetryCount,
                TenantId = j.TenantId,
                OutputManifestS3Path = j.OutputManifestS3Path
            });
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transcoding jobs");
            return StatusCode(500, "An error occurred while retrieving transcoding jobs");
        }
    }
    
    /// <summary>
    /// Gets a specific transcoding job by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(TranscodingJobDetailResponse))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJob(Guid id)
    {
        try
        {
            var job = await _repository.GetJobByIdAsync(id);
            
            if (job == null)
            {
                return NotFound();
            }
            
            var renditions = await _repository.GetRenditionsForJobAsync(job.Id);
            
            var renditionResponses = renditions.Select(r => new RenditionResponse
            {
                Id = r.Id,
                Resolution = r.Resolution,
                Bitrate = r.Bitrate,
                Status = r.Status.ToString(),
                CreatedAt = r.CreatedAt,
                CompletedAt = r.CompletedAt,
                OutputPath = r.OutputPath
            }).ToList();
            
            var response = new TranscodingJobDetailResponse
            {
                Id = job.Id,
                VideoId = job.VideoId,
                Status = job.Status.ToString(),
                CreatedAt = job.CreatedAt,
                UpdatedAt = job.UpdatedAt,
                ErrorMessage = job.ErrorMessage,
                RetryCount = job.RetryCount,
                TenantId = job.TenantId,
                InputFileS3Path = job.InputFileS3Path,
                OutputManifestS3Path = job.OutputManifestS3Path,
                Renditions = renditionResponses
            };
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transcoding job {JobId}", id);
            return StatusCode(500, "An error occurred while retrieving the transcoding job");
        }
    }
    
    /// <summary>
    /// Gets a transcoding job by video ID
    /// </summary>
    [HttpGet("by-video/{videoId}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(TranscodingJobDetailResponse))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJobByVideoId(Guid videoId, [FromQuery] string tenantId = "default")
    {
        try
        {
            var job = await _repository.GetJobByVideoIdAsync(videoId, tenantId);
            
            if (job == null)
            {
                return NotFound();
            }
            
            var renditions = await _repository.GetRenditionsForJobAsync(job.Id);
            
            var renditionResponses = renditions.Select(r => new RenditionResponse
            {
                Id = r.Id,
                Resolution = r.Resolution,
                Bitrate = r.Bitrate,
                Status = r.Status.ToString(),
                CreatedAt = r.CreatedAt,
                CompletedAt = r.CompletedAt,
                OutputPath = r.OutputPath
            }).ToList();
            
            var response = new TranscodingJobDetailResponse
            {
                Id = job.Id,
                VideoId = job.VideoId,
                Status = job.Status.ToString(),
                CreatedAt = job.CreatedAt,
                UpdatedAt = job.UpdatedAt,
                ErrorMessage = job.ErrorMessage,
                RetryCount = job.RetryCount,
                TenantId = job.TenantId,
                InputFileS3Path = job.InputFileS3Path,
                OutputManifestS3Path = job.OutputManifestS3Path,
                Renditions = renditionResponses
            };
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transcoding job for video {VideoId}", videoId);
            return StatusCode(500, "An error occurred while retrieving the transcoding job");
        }
    }
    
    /// <summary>
    /// Gets renditions for a specific transcoding job
    /// </summary>
    [HttpGet("{id}/renditions")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<RenditionResponse>))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetJobRenditions(Guid id)
    {
        try
        {
            var job = await _repository.GetJobByIdAsync(id);
            
            if (job == null)
            {
                return NotFound();
            }
            
            var renditions = await _repository.GetRenditionsForJobAsync(job.Id);
            
            var renditionResponses = renditions.Select(r => new RenditionResponse
            {
                Id = r.Id,
                Resolution = r.Resolution,
                Bitrate = r.Bitrate,
                Status = r.Status.ToString(),
                CreatedAt = r.CreatedAt,
                CompletedAt = r.CompletedAt,
                OutputPath = r.OutputPath
            }).ToList();
            
            return Ok(renditionResponses);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting renditions for job {JobId}", id);
            return StatusCode(500, "An error occurred while retrieving the renditions");
        }
    }
    
    /// <summary>
    /// Aborts a running transcoding job
    /// </summary>
    [HttpPost("{id}/abort")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AbortJob(Guid id)
    {
        try
        {
            var job = await _repository.GetJobByIdAsync(id);
            
            if (job == null)
            {
                return NotFound();
            }
            
            if (job.Status != TranscodingJobStatus.Received && job.Status != TranscodingJobStatus.Processing)
            {
                return BadRequest($"Cannot abort job with status {job.Status}");
            }
            
            var success = await _transcodingService.AbortJobAsync(id);
            
            if (success)
            {
                return Ok(new { message = "Job aborted successfully" });
            }
            else
            {
                return StatusCode(500, "Failed to abort job");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error aborting job {JobId}", id);
            return StatusCode(500, "An error occurred while aborting the job");
        }
    }
    
    /// <summary>
    /// Gets job progress statistics
    /// </summary>
    [HttpGet("statistics")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(JobStatistics))]
    public async Task<IActionResult> GetStatistics()
    {
        try
        {
            var jobs = await _repository.GetJobsAsync();
            
            var statistics = new JobStatistics
            {
                TotalJobs = jobs.Count(),
                PendingJobs = jobs.Count(j => j.Status == TranscodingJobStatus.Received),
                ProcessingJobs = jobs.Count(j => j.Status == TranscodingJobStatus.Processing),
                CompletedJobs = jobs.Count(j => j.Status == TranscodingJobStatus.Completed || j.Status == TranscodingJobStatus.Notified),
                FailedJobs = jobs.Count(j => j.Status == TranscodingJobStatus.Failed)
            };
            
            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting job statistics");
            return StatusCode(500, "An error occurred while retrieving job statistics");
        }
    }
}
