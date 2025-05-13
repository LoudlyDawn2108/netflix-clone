using MassTransit;
using Microsoft.Extensions.Logging;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;

namespace Streamflix.Transcoding.Worker.Consumers;

public class VideoProcessingFailedConsumer : IConsumer<VideoProcessingFailedEvent>
{
    private readonly ITranscodingRepository _repository;
    private readonly ILogger<VideoProcessingFailedConsumer> _logger;

    public VideoProcessingFailedConsumer(
        ITranscodingRepository repository,
        ILogger<VideoProcessingFailedConsumer> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task Consume(ConsumeContext<VideoProcessingFailedEvent> context)
    {
        var failedEvent = context.Message;
        
        _logger.LogWarning("Received VideoProcessingFailed event for video ID: {VideoId}, Error: {ErrorMessage}",
            failedEvent.VideoId, failedEvent.ErrorMessage);

        try
        {
            // Find the job for this video - adding tenantId from the event
            var job = await _repository.GetJobByVideoIdAsync(failedEvent.VideoId, failedEvent.TenantId);
            
            if (job == null)
            {
                _logger.LogWarning("No job found for failed video ID: {VideoId}, tenant ID: {TenantId}", 
                    failedEvent.VideoId, failedEvent.TenantId);
                return;
            }
            
            // Build detailed error message with diagnostic info
            var errorDetails = $"{failedEvent.ExceptionType}: {failedEvent.ErrorMessage}";
            
            if (failedEvent.DiagnosticInfo?.Any() == true)
            {
                errorDetails += "\nDiagnostic Information:";
                foreach (var info in failedEvent.DiagnosticInfo)
                {
                    errorDetails += $"\n- {info.Key}: {info.Value}";
                }
            }
            
            // Update job status to failed with error details
            await _repository.UpdateJobStatusAsync(job.Id, TranscodingJobStatus.Failed, errorDetails);
            
            _logger.LogInformation("Updated job {JobId} status to Failed with error details", job.Id);
            
            // You could implement additional error notification here:
            // - Send email notifications to admins
            // - Create error tickets in a tracking system
            // - Update monitoring dashboards
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling VideoProcessingFailed event for video ID: {VideoId}", 
                failedEvent.VideoId);
        }
    }
}
