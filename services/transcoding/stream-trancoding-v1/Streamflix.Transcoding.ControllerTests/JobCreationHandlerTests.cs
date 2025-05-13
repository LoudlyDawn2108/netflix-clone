using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;
using Streamflix.Transcoding.Worker.Handlers;
using Xunit;

namespace Streamflix.Transcoding.ControllerTests
{
    public class JobCreationHandlerTests
    {
        private readonly Mock<ITranscodingRepository> _mockRepository;
        private readonly Mock<ITranscodingService> _mockTranscodingService;
        private readonly Mock<ILogger<JobCreationHandler>> _mockLogger;

        public JobCreationHandlerTests()
        {
            _mockRepository = new Mock<ITranscodingRepository>();
            _mockTranscodingService = new Mock<ITranscodingService>();
            _mockLogger = new Mock<ILogger<JobCreationHandler>>();
        }

        [Fact]
        public async Task ExecuteAsync_WithPendingJobs_ProcessesJobs()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var videoId = Guid.NewGuid();
            
            var pendingJob = new TranscodingJob
            {
                Id = jobId,
                VideoId = videoId,
                Status = TranscodingJobStatus.Received,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5),
                TenantId = "tenant1"
            };
            
            var pendingJobs = new List<TranscodingJob> { pendingJob };
            
            // Fix: Explicitly provide the limit parameter
            _mockRepository.Setup(repo => repo.GetJobsByStatusAsync(TranscodingJobStatus.Received, 100))
                .ReturnsAsync(pendingJobs);
            
            _mockTranscodingService.Setup(service => service.IsJobBeingProcessedAsync(videoId))
                .ReturnsAsync(false);
            
            // Use TaskCompletionSource to signal when update is called
            var tcs = new TaskCompletionSource<bool>();
            
            _mockRepository.Setup(repo => repo.UpdateJobAsync(It.IsAny<TranscodingJob>()))
                .Callback<TranscodingJob>(job => 
                {
                    // Check that the job status was updated to Processing
                    Assert.Equal(TranscodingJobStatus.Processing, job.Status);
                    Assert.True(job.UpdatedAt > job.CreatedAt);
                    
                    // Signal test completion
                    tcs.SetResult(true);
                })
                .ReturnsAsync((TranscodingJob job) => job);
            
            // Create handler with mocked dependencies
            var handler = new JobCreationHandler(
                _mockRepository.Object,
                _mockTranscodingService.Object,
                _mockLogger.Object);
            
            // Use a cancellation token that will be triggered after the first successful job processing
            var cts = new CancellationTokenSource();
            
            // Act - Start the background service
            var handlerTask = handler.StartAsync(cts.Token);
            
            // Wait for the update call to be made or timeout after 5 seconds
            var completedTask = await Task.WhenAny(tcs.Task, Task.Delay(5000));
            
            // Cancel to stop the handler
            cts.Cancel();
            await handler.StopAsync(CancellationToken.None);
            
            // Assert
            Assert.True(completedTask == tcs.Task, "Timed out waiting for job to be processed");
            _mockRepository.Verify(repo => repo.UpdateJobAsync(It.Is<TranscodingJob>(j => 
                j.Id == jobId && j.Status == TranscodingJobStatus.Processing)), Times.Once);
        }

        [Fact]
        public async Task ExecuteAsync_WithAlreadyProcessingJob_SkipsJob()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var videoId = Guid.NewGuid();
            
            var pendingJob = new TranscodingJob
            {
                Id = jobId,
                VideoId = videoId,
                Status = TranscodingJobStatus.Received,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5),
                TenantId = "tenant1"
            };
            
            var pendingJobs = new List<TranscodingJob> { pendingJob };
            
            // Fix: Explicitly provide the limit parameter
            _mockRepository.Setup(repo => repo.GetJobsByStatusAsync(TranscodingJobStatus.Received, 100))
                .ReturnsAsync(pendingJobs);
            
            // Simulate job is already being processed
            _mockTranscodingService.Setup(service => service.IsJobBeingProcessedAsync(videoId))
                .ReturnsAsync(true);
            
            // Set up a way to detect if the polling cycle has completed
            var pollingCompleted = new TaskCompletionSource<bool>();
            
            // Fix: Explicitly provide the limit parameter
            _mockRepository.Setup(repo => repo.GetJobsByStatusAsync(TranscodingJobStatus.Received, 100))
                .Callback(() => 
                {
                    // The second time this is called will be after a complete polling cycle
                    if (!pollingCompleted.Task.IsCompleted)
                    {
                        pollingCompleted.SetResult(true);
                    }
                })
                .ReturnsAsync(pendingJobs);
            
            // Create handler with mocked dependencies
            var handler = new JobCreationHandler(
                _mockRepository.Object,
                _mockTranscodingService.Object,
                _mockLogger.Object);
            
            // Act - Start the background service
            var cts = new CancellationTokenSource();
            var handlerTask = handler.StartAsync(cts.Token);
            
            // Wait for one polling cycle to complete or timeout
            var completedTask = await Task.WhenAny(pollingCompleted.Task, Task.Delay(5000));
            
            // Stop the handler
            cts.Cancel();
            await handler.StopAsync(CancellationToken.None);
            
            // Assert
            Assert.True(completedTask == pollingCompleted.Task, "Timed out waiting for polling cycle");
            
            // Verify UpdateJobAsync was never called since job is already being processed
            _mockRepository.Verify(repo => repo.UpdateJobAsync(It.IsAny<TranscodingJob>()), Times.Never);
        }
    }
}
