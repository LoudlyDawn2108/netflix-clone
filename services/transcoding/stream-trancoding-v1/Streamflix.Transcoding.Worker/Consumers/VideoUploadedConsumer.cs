using MassTransit;
using Microsoft.Extensions.Logging;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Streamflix.Transcoding.Worker.Consumers
{
    public class VideoUploadedConsumer : IConsumer<VideoUploaded>
    {
        private readonly ILogger<VideoUploadedConsumer> _logger;
        private readonly IJobCreationHandlerService _jobCreationHandlerService;

        public VideoUploadedConsumer(ILogger<VideoUploadedConsumer> logger, IJobCreationHandlerService jobCreationHandlerService)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _jobCreationHandlerService = jobCreationHandlerService ?? throw new ArgumentNullException(nameof(jobCreationHandlerService));
        }

        public async Task Consume(ConsumeContext<VideoUploaded> context)
        {
            var videoUploadedEvent = context.Message;
            var messageId = context.MessageId?.ToString() ?? "N/A";
            var correlationId = context.CorrelationId?.ToString() ?? videoUploadedEvent.VideoId.ToString();

            using (_logger.BeginScope(new Dictionary<string, object>
            {
                ["CorrelationId"] = correlationId,
                ["VideoId"] = videoUploadedEvent.VideoId,
                ["MessageId"] = messageId
            }))
            {
                _logger.LogInformation("Received VideoUploaded event for VideoId: {VideoId}, FilePath: {FilePath}, TenantId: {TenantId}",
                    videoUploadedEvent.VideoId, videoUploadedEvent.FilePath, videoUploadedEvent.TenantId);

                try
                {
                    await _jobCreationHandlerService.HandleVideoUploadedAsync(videoUploadedEvent);
                    _logger.LogInformation("Successfully initiated job creation for VideoUploaded event for VideoId: {VideoId}", videoUploadedEvent.VideoId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing VideoUploaded event for VideoId: {VideoId}. Publishing VideoProcessingFailedEvent and rethrowing for MassTransit retry/DLQ.", videoUploadedEvent.VideoId);

                    await context.Publish(new VideoProcessingFailedEvent
                    {
                        VideoId = videoUploadedEvent.VideoId,
                        TenantId = videoUploadedEvent.TenantId,
                        ErrorMessage = ex.Message,
                        ExceptionType = ex.GetType().Name,
                        Timestamp = DateTime.UtcNow,
                        DiagnosticInfo = new Dictionary<string, string>
                        {
                            { "OriginalMessageId", messageId },
                            { "OriginalCorrelationId", correlationId },
                            { "StackTrace", ex.StackTrace ?? "Not available" }
                        }
                    });
                    throw; // Re-throw to let MassTransit handle retry/dead-letter for the VideoUploaded message
                }
            }
        }
    }
}