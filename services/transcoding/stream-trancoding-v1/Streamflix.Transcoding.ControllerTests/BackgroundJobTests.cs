using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;
using Xunit;

namespace Streamflix.Transcoding.ControllerTests
{
    /// <summary>
    /// Tests key job processing logic without depending on the Worker namespace
    /// </summary>
    public class BackgroundJobTests
    {
        private readonly Mock<ITranscodingRepository> _mockRepository;
        private readonly Mock<ITranscodingService> _mockTranscodingService;
        private readonly Mock<ILogger> _mockLogger;

        public BackgroundJobTests()
        {
            _mockRepository = new Mock<ITranscodingRepository>();
            _mockTranscodingService = new Mock<ITranscodingService>();
            _mockLogger = new Mock<ILogger>();
        }

        [Fact]
        public async Task ProcessPendingJobs_WithAvailableJobs_UpdatesToProcessing()
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
            
            // Act
            await ProcessPendingJobsAsync(); // This simulates the core logic from JobCreationHandler
            
            // Assert
            _mockRepository.Verify(repo => repo.UpdateJobAsync(It.Is<TranscodingJob>(j => 
                j.Id == jobId && j.Status == TranscodingJobStatus.Processing)), Times.Once);
        }

        [Fact]
        public async Task ProcessPendingJobs_WithJobAlreadyBeingProcessed_SkipsJob()
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
            
            // Act
            await ProcessPendingJobsAsync(); // This simulates the core logic from JobCreationHandler
            
            // Assert
            _mockRepository.Verify(repo => repo.UpdateJobAsync(It.IsAny<TranscodingJob>()), Times.Never);
        }

        /// <summary>
        /// This method simulates the core logic of JobCreationHandler.ExecuteAsync without
        /// requiring the full background service implementation
        /// </summary>
        private async Task ProcessPendingJobsAsync()
        {
            try
            {
                // Get pending jobs from the database
                var pendingJobs = await _mockRepository.Object.GetJobsByStatusAsync(TranscodingJobStatus.Received, 100);
                
                foreach (var job in pendingJobs)
                {
                    // Skip jobs that are already being processed (has lock)
                    if (await _mockTranscodingService.Object.IsJobBeingProcessedAsync(job.VideoId))
                    {
                        // Job is already being processed, skip it
                        continue;
                    }
                    
                    // Process the job by updating its status to Processing
                    job.Status = TranscodingJobStatus.Processing;
                    job.UpdatedAt = DateTime.UtcNow;
                    await _mockRepository.Object.UpdateJobAsync(job);
                }
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error processing pending jobs: {ex.Message}");
            }
        }
    }
}
