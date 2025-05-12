using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Streamflix.Transcoding.API.Controllers;
using Streamflix.Transcoding.API.Models;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;
using Xunit;

namespace Streamflix.Transcoding.ControllerTests
{
    public class TranscodingJobsControllerTests
    {
        private readonly Mock<ITranscodingRepository> _mockRepository;
        private readonly Mock<ITranscodingService> _mockTranscodingService;
        private readonly Mock<ILogger<TranscodingJobsController>> _mockLogger;
        private readonly TranscodingJobsController _controller;

        public TranscodingJobsControllerTests()
        {
            // Setup mocks
            _mockRepository = new Mock<ITranscodingRepository>();
            _mockTranscodingService = new Mock<ITranscodingService>();
            _mockLogger = new Mock<ILogger<TranscodingJobsController>>();
            
            // Create controller with mocked dependencies
            _controller = new TranscodingJobsController(
                _mockRepository.Object,
                _mockTranscodingService.Object,
                _mockLogger.Object
            );
        }

        [Fact]
        public async Task GetJobs_ReturnsOkResult_WithListOfJobs()
        {
            // Arrange
            var jobs = new List<TranscodingJob>
            {
                new TranscodingJob
                {
                    Id = Guid.NewGuid(),
                    VideoId = Guid.NewGuid(),
                    Status = TranscodingJobStatus.Received,
                    CreatedAt = DateTime.UtcNow,
                    TenantId = "tenant1"
                },
                new TranscodingJob
                {
                    Id = Guid.NewGuid(),
                    VideoId = Guid.NewGuid(),
                    Status = TranscodingJobStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    TenantId = "tenant2"
                }
            };

            _mockRepository.Setup(repo => repo.GetJobsAsync())
                .ReturnsAsync(jobs);

            // Act
            var result = await _controller.GetJobs(null, null);

            // Assert
            var okResult = result as OkObjectResult;
            Assert.NotNull(okResult);
            
            var returnedJobs = okResult.Value as IEnumerable<TranscodingJobResponse>;
            Assert.NotNull(returnedJobs);
            Assert.Equal(2, returnedJobs.Count());
            Assert.Equal(jobs[0].Id, returnedJobs.ElementAt(0).Id);
            Assert.Equal(jobs[1].Id, returnedJobs.ElementAt(1).Id);
        }

        [Fact]
        public async Task GetJob_WithValidId_ReturnsOkResultWithJob()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = Guid.NewGuid(),
                Status = TranscodingJobStatus.Completed,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TenantId = "tenant1",
                InputFileS3Path = "input/path",
                OutputManifestS3Path = "output/path"
            };

            var renditions = new List<Rendition>
            {
                new Rendition
                {
                    Id = Guid.NewGuid(),
                    TranscodingJobId = jobId,
                    Resolution = "720p",
                    Bitrate = 2500000,
                    Status = RenditionStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    OutputPath = "output/path/720p"
                }
            };

            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
            _mockRepository.Setup(repo => repo.GetRenditionsForJobAsync(jobId))
                .ReturnsAsync(renditions);

            // Act
            var result = await _controller.GetJob(jobId);

            // Assert
            var okResult = result as OkObjectResult;
            Assert.NotNull(okResult);
            
            var returnedJob = okResult.Value as TranscodingJobDetailResponse;
            Assert.NotNull(returnedJob);
            Assert.Equal(jobId, returnedJob.Id);
            Assert.Equal("Completed", returnedJob.Status);
            Assert.Single(returnedJob.Renditions);
            Assert.Equal("720p", returnedJob.Renditions.ElementAt(0).Resolution);
        }

        [Fact]
        public async Task GetJob_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync((TranscodingJob)null);

            // Act
            var result = await _controller.GetJob(jobId);

            // Assert
            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task AbortJob_WithValidIdAndStatus_ReturnsOkResult()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = Guid.NewGuid(),
                Status = TranscodingJobStatus.Processing,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
            _mockTranscodingService.Setup(service => service.AbortJobAsync(jobId))
                .ReturnsAsync(true);

            // Act
            var result = await _controller.AbortJob(jobId);

            // Assert
            var okResult = result as OkObjectResult;
            Assert.NotNull(okResult);
            
            // Convert the response object to a Dictionary to access properties
            var responseDict = JsonSerializer.Deserialize<Dictionary<string, object>>(
                JsonSerializer.Serialize(okResult.Value));
            
            Assert.True(responseDict.ContainsKey("message"));
            Assert.Equal("Job aborted successfully", responseDict["message"].ToString());
        }
    }
}