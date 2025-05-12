using MassTransit;
using Microsoft.Extensions.Logging;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;

namespace Streamflix.Transcoding.Worker.Handlers;

public class JobCompletionHandler : BackgroundService
{
    private readonly ITranscodingRepository _repository;
    private readonly ITranscodingService _transcodingService;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<JobCompletionHandler> _logger;
    private readonly TimeSpan _pollingInterval = TimeSpan.FromSeconds(30);

    public JobCompletionHandler(
        ITranscodingRepository repository,
        ITranscodingService transcodingService,
        IPublishEndpoint publishEndpoint,
        ILogger<JobCompletionHandler> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _transcodingService = transcodingService ?? throw new ArgumentNullException(nameof(transcodingService));
        _publishEndpoint = publishEndpoint ?? throw new ArgumentNullException(nameof(publishEndpoint));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Job completion handler started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Get completed jobs that haven't been processed yet
                var completedJobs = await _repository.GetJobsByStatusAsync(JobStatus.Completed);
                
                foreach (var job in completedJobs)
                {
                    try
                    {
                        // Check if this job should be processed
                        if (!ShouldProcessCompletedJob(job))
                        {
                            continue;
                        }

                        // Generate the transcoded event
                        var transcodedEvent = await _transcodingService.GenerateTranscodedEventAsync(job.Id);

                        // Publish the event
                        await _publishEndpoint.Publish(transcodedEvent, stoppingToken);

                        _logger.LogInformation("Published VideoTranscoded event for job {JobId}, video {VideoId}",
                            job.Id, job.VideoId);

                        // Mark the job as notified
                        job.Status = JobStatus.Notified;
                        await _repository.UpdateJobAsync(job);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error publishing VideoTranscoded event for job {JobId}", job.Id);
                    }
                }

                await Task.Delay(_pollingInterval, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in job completion handler");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        _logger.LogInformation("Job completion handler stopped");
    }

    private bool ShouldProcessCompletedJob(TranscodingJob job)
    {
        // Check if the job was recently completed (within the last minute)
        // This helps avoid race conditions with the job processor
        if (job.CompletedAt.HasValue && (DateTime.UtcNow - job.CompletedAt.Value).TotalMinutes < 1)
        {
            return true;
        }

        return false;
    }
}