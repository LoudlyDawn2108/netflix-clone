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
{    public class JobCreationHandlerService : IJobCreationHandlerService
    {
        private readonly ILogger<JobCreationHandlerService> _logger;
        private readonly ITranscodingService _transcodingService;
        private readonly IPublishEndpoint _publishEndpoint;

        public JobCreationHandlerService(
            ILogger<JobCreationHandlerService> logger,
            ITranscodingService transcodingService,
            IPublishEndpoint publishEndpoint)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _transcodingService = transcodingService ?? throw new ArgumentNullException(nameof(transcodingService));
            _publishEndpoint = publishEndpoint ?? throw new ArgumentNullException(nameof(publishEndpoint));
        }        public async Task HandleVideoUploadedAsync(VideoUploaded videoUploadedEvent)
        {
            try
            {
                _logger.LogInformation("Processing VideoUploaded event for VideoId: {VideoId}, FilePath: {FilePath}, TenantId: {TenantId}",
                    videoUploadedEvent.VideoId, videoUploadedEvent.FilePath, videoUploadedEvent.TenantId);

                // Check if the job is already being processed
                if (await _transcodingService.IsJobBeingProcessedAsync(videoUploadedEvent.VideoId))
                {
                    _logger.LogWarning("Job for VideoId: {VideoId} is already being processed. Skipping.",
                        videoUploadedEvent.VideoId);
                    return;
                }

                // Process the video using our TranscodingService
                var job = await _transcodingService.ProcessVideoAsync(videoUploadedEvent);
                _logger.LogInformation("Successfully processed transcoding job with Id: {JobId} for VideoId: {VideoId}. Status: {Status}",
                    job.Id, job.VideoId, job.Status);

                // If the job is completed, generate and publish the transcoded event
                if (job.Status == TranscodingJobStatus.Completed)
                {
                    var videoTranscodedEvent = await _transcodingService.GenerateTranscodedEventAsync(job.Id);
                    await _publishEndpoint.Publish(videoTranscodedEvent);
                    _logger.LogInformation("Published VideoTranscoded event for JobId: {JobId}", job.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing VideoUploaded event for VideoId: {VideoId}", videoUploadedEvent.VideoId);
                throw;
            }
        }
        }
    }
}
