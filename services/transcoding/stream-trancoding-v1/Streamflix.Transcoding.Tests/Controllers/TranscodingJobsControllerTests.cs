using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using FluentAssertions;
using Streamflix.Transcoding.API.Controllers;
using Streamflix.Transcoding.API.Models;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;
using Xunit;

namespace Streamflix.Transcoding.Tests.Controllers
{
    public class TranscodingJobsControllerTests
    {
        private readonly TranscodingJobsController _controller;
        private readonly Mock<ITranscodingRepository> _mockRepository;
        private readonly Mock<ITranscodingService> _mockTranscodingService;
        private readonly Mock<ILogger<TranscodingJobsController>> _mockLogger;
        
        public TranscodingJobsControllerTests()
        {
            _mockRepository = new Mock<ITranscodingRepository>();
            _mockTranscodingService = new Mock<ITranscodingService>();
            _mockLogger = new Mock<ILogger<TranscodingJobsController>>();
            
            _controller = new TranscodingJobsController(
                _mockRepository.Object,
                _mockTranscodingService.Object,
                _mockLogger.Object);
        }
        
        [Fact]
        public async Task GetStatistics_ReturnsOkResultWithCorrectStats()
        {
            // Arrange
            var jobs = new List<TranscodingJob>
            {
                new TranscodingJob { Status = TranscodingJobStatus.Received },
                new TranscodingJob { Status = TranscodingJobStatus.Processing },
                new TranscodingJob { Status = TranscodingJobStatus.Processing },
                new TranscodingJob { Status = TranscodingJobStatus.Completed },
                new TranscodingJob { Status = TranscodingJobStatus.Notified },
                new TranscodingJob { Status = TranscodingJobStatus.Failed }
            };
            
            _mockRepository.Setup(repo => repo.GetJobsAsync())
                .ReturnsAsync(jobs);
                
            // Act
            var result = await _controller.GetStatistics();
            
            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var statistics = okResult.Value.Should().BeAssignableTo<TranscodingStatistics>().Subject;
            
            statistics.TotalJobs.Should().Be(6);
            statistics.PendingJobs.Should().Be(1); // Received jobs
            statistics.ProcessingJobs.Should().Be(2); // Processing jobs
            statistics.CompletedJobs.Should().Be(2); // Completed + Notified
            statistics.FailedJobs.Should().Be(1); // Failed jobs
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
                Status = TranscodingJobStatus.Processing,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TenantId = "default",
                ErrorMessage = null,
                RetryCount = 0
            };
            
            var renditions = new List<Rendition>
            {
                new Rendition
                {
                    Id = Guid.NewGuid(),
                    JobId = jobId,
                    Profile = "720p",
                    ResolutionWidth = 1280,
                    ResolutionHeight = 720,
                    OutputPath = "path/to/720p.m3u8",
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = null
                }
            };
            
            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
            _mockRepository.Setup(repo => repo.GetRenditionsForJobAsync(jobId))
                .ReturnsAsync(renditions);
                
            // Act
            var result = await _controller.GetJob(jobId);
            
            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeAssignableTo<TranscodingJobDetailResponse>().Subject;
            
            response.Id.Should().Be(jobId);
            response.VideoId.Should().Be(job.VideoId);
            response.Status.Should().Be(job.Status.ToString());
            response.Renditions.Should().HaveCount(1);
        }
        
        [Fact]
        public async Task GetJob_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            
            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync((TranscodingJob?)null);
                
            // Act
            var result = await _controller.GetJob(jobId);
            
            // Assert
            result.Should().BeOfType<NotFoundResult>();
        }
        
        [Fact]
        public async Task GetJobByVideoId_WithValidId_ReturnsOkResultWithJob()
        {
            // Arrange
            var videoId = Guid.NewGuid();
            var jobId = Guid.NewGuid();
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = videoId,
                Status = TranscodingJobStatus.Processing,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TenantId = "default"
            };
            
            var renditions = new List<Rendition>
            {
                new Rendition
                {
                    Id = Guid.NewGuid(),
                    JobId = jobId,
                    Profile = "720p",
                    ResolutionWidth = 1280,
                    ResolutionHeight = 720,
                    OutputPath = "path/to/720p.m3u8",
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = null
                }
            };
            
            _mockRepository.Setup(repo => repo.GetJobByVideoIdAsync(videoId, "default"))
                .ReturnsAsync(job);
            _mockRepository.Setup(repo => repo.GetRenditionsForJobAsync(jobId))
                .ReturnsAsync(renditions);
                
            // Act
            var result = await _controller.GetJobByVideoId(videoId);
            
            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeAssignableTo<TranscodingJobDetailResponse>().Subject;
            
            response.Id.Should().Be(jobId);
            response.VideoId.Should().Be(videoId);
            response.Status.Should().Be(job.Status.ToString());
            response.Renditions.Should().HaveCount(1);
        }
        
        [Fact]
        public async Task GetJobByVideoId_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            var videoId = Guid.NewGuid();
            
            _mockRepository.Setup(repo => repo.GetJobByVideoIdAsync(videoId, "default"))
                .ReturnsAsync((TranscodingJob?)null);
                
            // Act
            var result = await _controller.GetJobByVideoId(videoId);
            
            // Assert
            result.Should().BeOfType<NotFoundResult>();
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
                CreatedAt = DateTime.UtcNow
            };

            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
            _mockTranscodingService.Setup(service => service.AbortJobAsync(jobId))
                .ReturnsAsync(true);

            // Act
            var result = await _controller.AbortJob(jobId);
            
            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            // The controller returns an anonymous object
            var responseValue = okResult.Value?.GetType().GetProperty("message")?.GetValue(okResult.Value, null) as string;
            responseValue.Should().Be("Job aborted successfully");
        }
        
        [Fact]
        public async Task AbortJob_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            
            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync((TranscodingJob?)null);
                
            // Act
            var result = await _controller.AbortJob(jobId);
            
            // Assert
            result.Should().BeOfType<NotFoundResult>();
        }
        
        [Fact]
        public async Task AbortJob_WithInvalidStatus_ReturnsBadRequest()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = Guid.NewGuid(),
                Status = TranscodingJobStatus.Completed
            };
            
            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
                
            // Act
            var result = await _controller.AbortJob(jobId);
            
            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }
        
        [Fact]
        public async Task AbortJob_WithFailedService_ReturnsServerError()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = Guid.NewGuid(),
                Status = TranscodingJobStatus.Processing
            };
            
            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
            _mockTranscodingService.Setup(service => service.AbortJobAsync(jobId))
                .ReturnsAsync(false);
                
            // Act
            var result = await _controller.AbortJob(jobId);
            
            // Assert
            var statusCodeResult = result.Should().BeOfType<ObjectResult>().Subject;
            statusCodeResult.StatusCode.Should().Be(500);
        }
    }
}
