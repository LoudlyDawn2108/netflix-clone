using MassTransit;
using Microsoft.Extensions.Logging;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;

namespace Streamflix.Transcoding.Worker.Consumers;

public class VideoUploadedConsumer : IConsumer<VideoUploadedEvent>
{
    private readonly ITranscodingService _transcodingService;
    private readonly ILogger<VideoUploadedConsumer> _logger;

    public VideoUploadedConsumer(ITranscodingService transcodingService, ILogger<VideoUploadedConsumer> logger)
    {
        _transcodingService = transcodingService ?? throw new ArgumentNullException(nameof(transcodingService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task Consume(ConsumeContext<VideoUploadedEvent> context)
    {
        var videoEvent = context.Message;
        _logger.LogInformation("Received VideoUploaded event for video ID: {VideoId}", videoEvent.VideoId);

        try
        {
            var job = await _transcodingService.ProcessVideoAsync(videoEvent);
            _logger.LogInformation("Successfully created transcoding job {JobId} for video {VideoId}, status: {Status}",
                job.Id, job.VideoId, job.Status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing VideoUploaded event for video ID: {VideoId}", videoEvent.VideoId);
            
            // Re-throw to trigger retry policy in MassTransit
            throw;
        }
    }
}