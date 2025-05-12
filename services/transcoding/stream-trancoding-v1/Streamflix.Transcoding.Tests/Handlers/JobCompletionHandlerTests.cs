using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.Extensions.Logging;
using Moq;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Worker.Handlers;
using Xunit;

namespace Streamflix.Transcoding.Tests.Handlers
{
    public class JobCompletionHandlerTests
    {
        private readonly Mock<ITranscodingRepository> _mockRepository;
        private readonly Mock<ITranscodingService> _mockTranscodingService;
        private readonly Mock<IPublishEndpoint> _mockPublishEndpoint;
        private readonly Mock<ILogger<JobCompletionHandler>> _mockLogger;
        
        public JobCompletionHandlerTests()
        {
            _mockRepository = new Mock<ITranscodingRepository>();
            _mockTranscodingService = new Mock<ITranscodingService>();
            _mockPublishEndpoint = new Mock<IPublishEndpoint>();
            _mockLogger = new Mock<ILogger<JobCompletionHandler>>();
        }

        [Fact]
        public async Task ExecuteAsync_WithCompletedJobs_PublishesEvents()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var videoId = Guid.NewGuid();

            var completedJob = new TranscodingJob
            {
                Id = jobId,
                VideoId = videoId,
                Status = JobStatus.Completed,
                CreatedAt = DateTime.UtcNow.AddMinutes(-30),
                CompletedAt = DateTime.UtcNow.AddMinutes(-20), // Job completed 20 minutes ago
                TenantId = "tenant1"
            };

            var jobs = new List<TranscodingJob> { completedJob };

            var transcodedEvent = new VideoTranscodedEvent
            {
                VideoId = videoId,
                ManifestPath = "output/manifest.m3u8",
                CompletedAt = DateTime.UtcNow,
                TenantId = "tenant1",
                Renditions = new List<RenditionInfo>
                {
                    new RenditionInfo { Resolution = "720p", Width = 1280, Height = 720 }
                }
            };

            _mockRepository.Setup(r => r.GetJobsByStatusAsync(JobStatus.Completed))
                .ReturnsAsync(jobs);

            _mockTranscodingService.Setup(s => s.GenerateTranscodedEventAsync(jobId))
                .ReturnsAsync(transcodedEvent);

            // Use TaskCompletionSource to stop the background service after first run
            var cts = new CancellationTokenSource();
            var tcs = new TaskCompletionSource<bool>();
            
            // Update the job to have the Notified status when UpdateJobAsync is called
            _mockRepository.Setup(r => r.UpdateJobAsync(It.IsAny<TranscodingJob>()))
                .Callback<TranscodingJob>(job => 
                {
                    // Verify the job status was updated to Notified
                    Assert.Equal(JobStatus.Notified, job.Status);
                    
                    // Signal to stop the background service
                    if (!tcs.Task.IsCompleted)
                    {
                        tcs.SetResult(true);
                        cts.Cancel();
                    }
                })
                .ReturnsAsync((TranscodingJob job) => job);

            // Create the handler
            var handler = new JobCompletionHandler(
                _mockRepository.Object,
                _mockTranscodingService.Object,
                _mockPublishEndpoint.Object,
                _mockLogger.Object);

            // Act - start the handler and wait for completion or timeout
            var handlerTask = handler.StartAsync(cts.Token);
            
            // Wait for our callback to be executed or timeout after 5 seconds
            var completed = await Task.WhenAny(tcs.Task, Task.Delay(5000));
            
            // Cancel the handler to stop it
            cts.Cancel();
            
            try
            {
                await handlerTask;
            }
            catch (OperationCanceledException)
            {
                // This is expected when we cancel the token
            }

            // Assert
            _mockPublishEndpoint.Verify(p => p.Publish(
                It.Is<VideoTranscodedEvent>(e => e.VideoId == videoId), 
                It.IsAny<CancellationToken>()), 
                Times.Once);
            
            // Also verify the job status was updated (already checked in callback)
            _mockRepository.Verify(r => r.UpdateJobAsync(It.Is<TranscodingJob>(j => 
                j.Id == jobId && j.Status == JobStatus.Notified)), 
                Times.Once);
        }
        
        [Fact]
        public async Task ExecuteAsync_WithFreshCompletedJobs_SkipsThem()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var videoId = Guid.NewGuid();

            var freshCompletedJob = new TranscodingJob
            {
                Id = jobId,
                VideoId = videoId,
                Status = JobStatus.Completed,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5),
                CompletedAt = DateTime.UtcNow.AddSeconds(-5), // Job just completed 5 seconds ago
                TenantId = "tenant1"
            };

            var jobs = new List<TranscodingJob> { freshCompletedJob };

            _mockRepository.Setup(r => r.GetJobsByStatusAsync(JobStatus.Completed))
                .ReturnsAsync(jobs);

            // Use TaskCompletionSource to stop the background service after a delay
            var cts = new CancellationTokenSource();
            
            // Create the handler
            var handler = new JobCompletionHandler(
                _mockRepository.Object,
                _mockTranscodingService.Object,
                _mockPublishEndpoint.Object,
                _mockLogger.Object);

            // Act - start the handler
            var handlerTask = handler.StartAsync(cts.Token);
            
            // Let it run for a bit
            await Task.Delay(1000);
            
            // Cancel the handler to stop it
            cts.Cancel();
            
            try
            {
                await handlerTask;
            }
            catch (OperationCanceledException)
            {
                // This is expected when we cancel the token
            }

            // Assert
            // Verify no event was published and no job was updated
            _mockPublishEndpoint.Verify(p => p.Publish(
                It.IsAny<VideoTranscodedEvent>(), 
                It.IsAny<CancellationToken>()), 
                Times.Never);
            
            _mockRepository.Verify(r => r.UpdateJobAsync(It.IsAny<TranscodingJob>()), Times.Never);
        }

        [Fact]
        public async Task ExecuteAsync_WithFailedPublishing_IncrementsAttempts()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var videoId = Guid.NewGuid();

            var completedJob = new TranscodingJob
            {
                Id = jobId,
                VideoId = videoId,
                Status = JobStatus.Completed,
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                CompletedAt = DateTime.UtcNow.AddMinutes(-30), // Job completed 30 minutes ago
                TenantId = "tenant1",
                NotificationAttempts = 2 // Already tried twice
            };

            var jobs = new List<TranscodingJob> { completedJob };

            var transcodedEvent = new VideoTranscodedEvent
            {
                VideoId = videoId,
                ManifestPath = "output/manifest.m3u8",
                CompletedAt = DateTime.UtcNow,
                TenantId = "tenant1"
            };

            _mockRepository.Setup(r => r.GetJobsByStatusAsync(JobStatus.Completed))
                .ReturnsAsync(jobs);

            _mockTranscodingService.Setup(s => s.GenerateTranscodedEventAsync(jobId))
                .ReturnsAsync(transcodedEvent);

            // Simulate a publishing failure
            _mockPublishEndpoint.Setup(p => p.Publish(
                It.IsAny<VideoTranscodedEvent>(),
                It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Failed to publish"));

            // Use TaskCompletionSource to stop the background service after first run
            var cts = new CancellationTokenSource();
            var tcs = new TaskCompletionSource<bool>();
            
            // Update the job to increment attempts when UpdateJobAsync is called
            _mockRepository.Setup(r => r.UpdateJobAsync(It.IsAny<TranscodingJob>()))
                .Callback<TranscodingJob>(job => 
                {
                    // First call is to increment attempts
                    if (job.NotificationAttempts == 3)
                    {
                        // Signal to stop the background service
                        if (!tcs.Task.IsCompleted)
                        {
                            tcs.SetResult(true);
                            cts.Cancel();
                        }
                    }
                })
                .ReturnsAsync((TranscodingJob job) => job);

            // Create the handler
            var handler = new JobCompletionHandler(
                _mockRepository.Object,
                _mockTranscodingService.Object,
                _mockPublishEndpoint.Object,
                _mockLogger.Object);

            // Act - start the handler and wait for completion or timeout
            var handlerTask = handler.StartAsync(cts.Token);
            
            // Wait for our callback to be executed or timeout after 5 seconds
            var completed = await Task.WhenAny(tcs.Task, Task.Delay(5000));
            
            // Cancel the handler to stop it
            cts.Cancel();
            
            try
            {
                await handlerTask;
            }
            catch (OperationCanceledException)
            {
                // This is expected when we cancel the token
            }

            // Assert
            // Verify that NotificationAttempts was incremented
            _mockRepository.Verify(r => r.UpdateJobAsync(It.Is<TranscodingJob>(j => 
                j.Id == jobId && j.NotificationAttempts == 3)), 
                Times.Once);
        }
    }
}