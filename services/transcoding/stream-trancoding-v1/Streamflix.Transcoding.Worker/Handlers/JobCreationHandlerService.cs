using MassTransit;
using Microsoft.Extensions.Logging;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
// Using alias for Entities.TranscodingJob to avoid conflict if any other TranscodingJob is in scope
using TranscodingJobEntity = Streamflix.Transcoding.Core.Entities.TranscodingJob;
using Streamflix.Transcoding.Core.Models;
using System.Threading.Tasks;
using System;

namespace Streamflix.Transcoding.Worker.Handlers
{
    public class JobCreationHandlerService : IJobCreationHandlerService
    {
        private readonly ILogger<JobCreationHandlerService> _logger;
        private readonly ITranscodingRepository _transcodingRepository; 
        private readonly IDistributedLockService _distributedLockService; 
        private readonly IPublishEndpoint _publishEndpoint; 

        public JobCreationHandlerService(
            ILogger<JobCreationHandlerService> logger,
            ITranscodingRepository transcodingRepository,
            IDistributedLockService distributedLockService,
            IPublishEndpoint publishEndpoint)
        {
            _logger = logger;
            _transcodingRepository = transcodingRepository;
            _distributedLockService = distributedLockService;
            _publishEndpoint = publishEndpoint;
        }

        public async Task HandleVideoUploadedAsync(VideoUploaded videoUploadedEvent)
        {
            var lockKey = $"job-creation:{videoUploadedEvent.VideoId}:{videoUploadedEvent.TenantId}";
            var lockAcquired = false;

            try
            {
                lockAcquired = await _distributedLockService.AcquireLockAsync(lockKey, TimeSpan.FromMinutes(1));
                if (!lockAcquired)
                {
                    _logger.LogWarning("Could not acquire lock for VideoId: {VideoId}, TenantId: {TenantId}. Event might be a duplicate or being processed.", 
                        videoUploadedEvent.VideoId, videoUploadedEvent.TenantId);
                    return; 
                }

                var existingJob = await _transcodingRepository.GetJobByVideoIdAsync(videoUploadedEvent.VideoId, videoUploadedEvent.TenantId);
                if (existingJob != null)
                {
                    _logger.LogInformation("Job already exists for VideoId: {VideoId}, TenantId: {TenantId}. Skipping creation.", 
                        videoUploadedEvent.VideoId, videoUploadedEvent.TenantId);
                    return; 
                }

                _logger.LogInformation("Creating new transcoding job for VideoId: {VideoId}, FilePath: {FilePath}, TenantId: {TenantId}",
                    videoUploadedEvent.VideoId, videoUploadedEvent.FilePath, videoUploadedEvent.TenantId);

                var newJob = new TranscodingJobEntity // Using alias
                {
                    Id = Guid.NewGuid(), 
                    VideoId = videoUploadedEvent.VideoId,
                    TenantId = videoUploadedEvent.TenantId,
                    InputFileS3Path = videoUploadedEvent.FilePath,
                    Status = TranscodingJobStatus.Received, // This is from Streamflix.Transcoding.Core.Models
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _transcodingRepository.CreateJobAsync(newJob);
                _logger.LogInformation("Successfully created transcoding job with Id: {JobId}", newJob.Id);

                await Task.Delay(TimeSpan.FromSeconds(5)); 

                var videoTranscodedEvent = new VideoTranscoded
                {
                    JobId = newJob.Id, // Refers to TranscodingJobEntity.Id
                    VideoId = newJob.VideoId, // Refers to TranscodingJobEntity.VideoId
                    TenantId = newJob.TenantId, // Refers to TranscodingJobEntity.TenantId
                    Success = true, 
                    ManifestUrl = $"s3://{newJob.TenantId}/videos/{newJob.VideoId}/manifest.m3u8", 
                    TranscodingStartedAt = newJob.CreatedAt, // Refers to TranscodingJobEntity.CreatedAt
                    TranscodingCompletedAt = DateTimeOffset.UtcNow,
                    OutputDetails = new System.Collections.Generic.Dictionary<string, string>
                    {
                        { "resolution_1080p", $"s3://{newJob.TenantId}/videos/{newJob.VideoId}/1080p/" },
                        { "resolution_720p", $"s3://{newJob.TenantId}/videos/{newJob.VideoId}/720p/" }
                    }
                };

                await _publishEndpoint.Publish(videoTranscodedEvent);
                _logger.LogInformation("Published VideoTranscoded event for JobId: {JobId}", newJob.Id);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing VideoUploaded event for VideoId: {VideoId}", videoUploadedEvent.VideoId);
                throw; 
            }
            finally
            {
                if (lockAcquired)
                {
                    await _distributedLockService.ReleaseLockAsync(lockKey);
                }
            }
        }
    }
}
