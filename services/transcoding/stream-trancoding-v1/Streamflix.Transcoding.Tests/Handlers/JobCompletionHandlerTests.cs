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
using Streamflix.Transcoding.Core.Models;
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
        private readonly JobCompletionHandler _handler;

        public JobCompletionHandlerTests()
        {
            _mockRepository = new Mock<ITranscodingRepository>();
            _mockTranscodingService = new Mock<ITranscodingService>();
            _mockPublishEndpoint = new Mock<IPublishEndpoint>();
            _mockLogger = new Mock<ILogger<JobCompletionHandler>>();
            
            _handler = new JobCompletionHandler(
                _mockRepository.Object,
                _mockTranscodingService.Object,
                _mockPublishEndpoint.Object,
                _mockLogger.Object);
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
                Status = TranscodingJobStatus.Completed,
                CreatedAt = DateTime.UtcNow.AddMinutes(-30),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-20), // Job completed 20 minutes ago
                TenantId = "tenant1",
                NotificationAttempts = 0
            };

            var jobs = new List<TranscodingJob> { completedJob };

            var transcodedEvent = new VideoTranscoded
            {
                VideoId = videoId,
                JobId = jobId,
                ManifestUrl = "output/manifest.m3u8",
                TranscodingCompletedAt = DateTime.UtcNow,
                TenantId = "tenant1",
                Success = true,
                OutputDetails = new Dictionary<string, string>
                {
                    { "720p", "1280x720" }
                }
            };
            
            _mockRepository.Setup(r => r.GetJobsByStatusAsync(TranscodingJobStatus.Completed, It.IsAny<int>()))
                .ReturnsAsync(jobs);

            _mockTranscodingService.Setup(s => s.GenerateTranscodedEventAsync(jobId))
                .ReturnsAsync(transcodedEvent);            _mockPublishEndpoint.Setup(p => p.Publish(It.IsAny<VideoTranscoded>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
                
            // Setup repository to return the job
            _mockRepository.Setup(r => r.GetJobByIdAsync(jobId))
                .ReturnsAsync(completedJob);

            // Update job with correct status
            _mockRepository.Setup(r => r.UpdateJobAsync(It.IsAny<TranscodingJob>()))
                .ReturnsAsync((TranscodingJob job) => 
                {
                    // Make a copy to avoid modifying the original
                    return new TranscodingJob
                    {
                        Id = job.Id,
                        VideoId = job.VideoId,
                        Status = job.Status,
                        NotificationAttempts = job.NotificationAttempts,
                        TenantId = job.TenantId,
                        CreatedAt = job.CreatedAt,
                        UpdatedAt = DateTime.UtcNow
                    };
                });

            // Use TaskCompletionSource to stop the background service after first run
            var cts = new CancellationTokenSource();

            // Act - Execute once
            await _handler.ExecuteAsync(jobId, cts.Token);

            // Assert
            _mockPublishEndpoint.Verify(p => p.Publish(
                It.Is<VideoTranscoded>(e => e.VideoId == videoId),
                It.IsAny<CancellationToken>()),
                Times.Once);

            // Also verify the job status was updated
            _mockRepository.Verify(r => r.UpdateJobAsync(It.Is<TranscodingJob>(j =>
                j.Id == jobId && j.Status == TranscodingJobStatus.Notified)),
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
                Status = TranscodingJobStatus.Completed,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5),
                UpdatedAt = DateTime.UtcNow.AddSeconds(-5), // Job just completed 5 seconds ago
                TenantId = "tenant1"
            };

            var jobs = new List<TranscodingJob> { freshCompletedJob };

            _mockRepository.Setup(r => r.GetJobsByStatusAsync(TranscodingJobStatus.Completed, It.IsAny<int>()))
                .ReturnsAsync(jobs);

            // Use TaskCompletionSource to stop the background service after a delay
            var cts = new CancellationTokenSource();

            // Act - Execute once
            await _handler.ExecuteAsync(jobId, cts.Token);

            // Assert
            // Verify no event was published and no job was updated
            _mockPublishEndpoint.Verify(p => p.Publish(
                It.IsAny<VideoTranscoded>(),
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
                Status = TranscodingJobStatus.Completed,
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-30), // Job completed 30 minutes ago
                TenantId = "tenant1",
                NotificationAttempts = 2 // Already tried twice
            };

            var jobs = new List<TranscodingJob> { completedJob };

            var transcodedEvent = new VideoTranscoded
            {
                VideoId = videoId,
                JobId = jobId,
                ManifestUrl = "output/manifest.m3u8",
                TranscodingCompletedAt = DateTime.UtcNow,
                TenantId = "tenant1",
                Success = true
            };

            _mockRepository.Setup(r => r.GetJobsByStatusAsync(TranscodingJobStatus.Completed, It.IsAny<int>()))
                .ReturnsAsync(jobs);
                
            // Add the GetJobByIdAsync setup for the test method to work
            _mockRepository.Setup(r => r.GetJobByIdAsync(jobId))
                .ReturnsAsync(completedJob);

            _mockTranscodingService.Setup(s => s.GenerateTranscodedEventAsync(jobId))
                .ReturnsAsync(transcodedEvent);

            // Simulate a publishing failure
            _mockPublishEndpoint.Setup(p => p.Publish(
                It.IsAny<VideoTranscoded>(),
                It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Failed to publish"));
                
            // Setup mock to update the job
            _mockRepository.Setup(r => r.UpdateJobAsync(It.IsAny<TranscodingJob>()))
                .ReturnsAsync((TranscodingJob job) =>
                {
                    // Make a copy with updated attempt count
                    return new TranscodingJob
                    {
                        Id = job.Id,
                        VideoId = job.VideoId,
                        Status = job.Status,
                        NotificationAttempts = job.NotificationAttempts,
                        TenantId = job.TenantId,
                        CreatedAt = job.CreatedAt,
                        UpdatedAt = DateTime.UtcNow
                    };
                });

            // Use TaskCompletionSource to stop the background service after first run
            var cts = new CancellationTokenSource();

            // Act
            await _handler.ExecuteAsync(jobId, cts.Token);

            // Assert
            // Verify that NotificationAttempts was incremented
            _mockRepository.Verify(r => r.UpdateJobAsync(It.Is<TranscodingJob>(j =>
                j.Id == jobId && j.NotificationAttempts == 3)),
                Times.Once);
        }
    }
}
