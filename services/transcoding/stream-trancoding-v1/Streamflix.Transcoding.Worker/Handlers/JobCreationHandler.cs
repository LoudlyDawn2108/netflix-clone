using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;

namespace Streamflix.Transcoding.Worker.Handlers;

public class JobCreationHandler : BackgroundService
{
    private readonly ITranscodingRepository _repository;
    private readonly ITranscodingService _transcodingService;
    private readonly ILogger<JobCreationHandler> _logger;
    private readonly TimeSpan _pollingInterval = TimeSpan.FromSeconds(10);
    private readonly AsyncRetryPolicy _retryPolicy;

    public JobCreationHandler(
        ITranscodingRepository repository,
        ITranscodingService transcodingService,
        ILogger<JobCreationHandler> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _transcodingService = transcodingService ?? throw new ArgumentNullException(nameof(transcodingService));
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
                        "Error processing job on attempt {RetryAttempt}. Waiting {TimeSpan} before next attempt", 
                        retryAttempt, timeSpan);
                });
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Job creation handler started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Get pending jobs from the database
                var pendingJobs = await _repository.GetJobsByStatusAsync(TranscodingJobStatus.Received);
                _logger.LogInformation("Found {Count} pending jobs to process", pendingJobs.Count());
                
                foreach (var job in pendingJobs)
                {
                    // Skip jobs that are already being processed (has lock)
                    if (await _transcodingService.IsJobBeingProcessedAsync(job.VideoId))
                    {
                        _logger.LogInformation("Job {JobId} for video {VideoId} is already being processed, skipping",
                            job.Id, job.VideoId);
                        continue;
                    }
                    
                    // Use the retry policy when starting to process the job
                    await _retryPolicy.ExecuteAsync(async () =>
                    {
                        try
                        {
                            // Update job status to processing if not already
                            if (job.Status == TranscodingJobStatus.Received)
                            {
                                job.Status = TranscodingJobStatus.Processing;
                                job.UpdatedAt = DateTime.UtcNow;
                                await _repository.UpdateJobAsync(job);
                            }
                            
                            _logger.LogInformation("Starting to process job {JobId} for video {VideoId}",
                                job.Id, job.VideoId);
                                
                            // Process the job (no-op if already processing due to idempotency checks)
                            // This is a placeholder - actual processing is done by the TranscodingService
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing job {JobId}", job.Id);
                            
                            // If we got here after all retries, mark the job as failed
                            await _repository.UpdateJobStatusAsync(job.Id, TranscodingJobStatus.Failed, ex.Message);
                            
                            // Re-throw to trigger the retry policy
                            throw;
                        }
                    });
                }

                // Sleep for a while before checking for more jobs
                await Task.Delay(_pollingInterval, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in job creation handler");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        _logger.LogInformation("Job creation handler stopped");
    }
}