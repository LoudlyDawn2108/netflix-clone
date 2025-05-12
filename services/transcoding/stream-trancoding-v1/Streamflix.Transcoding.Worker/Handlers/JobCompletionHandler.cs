using MassTransit;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;

namespace Streamflix.Transcoding.Worker.Handlers;

public class JobCompletionHandler : BackgroundService
{
    private readonly ITranscodingRepository _repository;
    private readonly ITranscodingService _transcodingService;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<JobCompletionHandler> _logger;
    private readonly TimeSpan _pollingInterval = TimeSpan.FromSeconds(30);
    private readonly AsyncRetryPolicy _retryPolicy;

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
        
        // Create retry policy with exponential backoff
        _retryPolicy = Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
                3, // Number of retries
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), // Exponential backoff
                (exception, timeSpan, retryAttempt, context) =>
                {
                    _logger.LogWarning(exception, 
                        "Error publishing event on attempt {RetryAttempt}. Waiting {TimeSpan} before next attempt", 
                        retryAttempt, timeSpan);
                });
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Job completion handler started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Get completed jobs that haven't been notified yet
                var completedJobs = await _repository.GetJobsByStatusAsync(TranscodingJobStatus.Completed);
                _logger.LogInformation("Found {Count} completed jobs to process", completedJobs.Count());
                
                foreach (var job in completedJobs)
                {
                    try
                    {
                        // Skip jobs that shouldn't be processed yet (still finishing up)
                        if (!ShouldProcessCompletedJob(job))
                        {
                            _logger.LogDebug("Skipping job {JobId} as it's not ready for notification yet", job.Id);
                            continue;
                        }

                        // Update retry count
                        job.RetryCount++;
                        await _repository.UpdateJobAsync(job);
                        
                        _logger.LogInformation("Attempting to publish completion event for job {JobId}, attempt {Attempt}", 
                            job.Id, job.RetryCount);

                        // Use retry policy when publishing events
                        await _retryPolicy.ExecuteAsync(async () => 
                        {
                            // Generate the transcoded event
                            var transcodedEvent = await _transcodingService.GenerateTranscodedEventAsync(job.Id);

                            // Publish the event
                            await _publishEndpoint.Publish(transcodedEvent, stoppingToken);

                            _logger.LogInformation("Published VideoTranscoded event for job {JobId}, video {VideoId}",
                                job.Id, job.VideoId);

                            // Mark the job as notified
                            job.Status = TranscodingJobStatus.Notified;
                            await _repository.UpdateJobAsync(job);
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error publishing VideoTranscoded event for job {JobId}", job.Id);
                        
                        // If the job has been retried too many times, mark it as failed
                        if (HasExceededNotificationRetries(job))
                        {
                            _logger.LogWarning("Job {JobId} has exceeded notification retries, marking as failed", job.Id);
                            await _repository.UpdateJobStatusAsync(job.Id, TranscodingJobStatus.Failed, 
                                $"Failed to notify completion after {job.RetryCount} attempts: {ex.Message}");
                                
                            // Publish a failure event
                            try
                            {
                                await _publishEndpoint.Publish(new VideoProcessingFailedEvent
                                {
                                    VideoId = job.VideoId,
                                    ErrorMessage = $"Failed to publish completion event after {job.RetryCount} attempts",
                                    ExceptionType = ex.GetType().Name,
                                    Timestamp = DateTime.UtcNow,
                                    TenantId = job.TenantId,
                                    DiagnosticInfo = new Dictionary<string, string>
                                    {
                                        { "JobId", job.Id.ToString() },
                                        { "RetryCount", job.RetryCount.ToString() },
                                        { "LastError", ex.Message }
                                    }
                                }, stoppingToken);
                            }
                            catch (Exception publishEx)
                            {
                                _logger.LogError(publishEx, "Failed to publish failure event for job {JobId}", job.Id);
                            }
                        }
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
        // Check if the job was updated recently (within the last 10 seconds)
        // This prevents race conditions where we might try to publish an event
        // before all renditions are fully committed to storage
        var cooldownPeriod = TimeSpan.FromSeconds(10);
        var jobAge = DateTime.UtcNow - job.UpdatedAt;
        
        if (jobAge < cooldownPeriod)
        {
            return false; // Job is too fresh, give it time to fully commit
        }
        
        return true;
    }
    
    private bool HasExceededNotificationRetries(TranscodingJob job)
    {
        const int maxRetries = 5;
        return job.RetryCount >= maxRetries;
    }
}