using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Streamflix.Transcoding.API.Controllers;
using Streamflix.Transcoding.API.Models;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Interfaces;
using Xunit;

namespace Streamflix.Transcoding.Tests.Controllers
{
    [Trait("Category", "Controller")]
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
                    Status = JobStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    TenantId = "tenant1"
                },
                new TranscodingJob
                {
                    Id = Guid.NewGuid(),
                    VideoId = Guid.NewGuid(),
                    Status = JobStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    TenantId = "tenant2"
                }
            };

            _mockRepository.Setup(repo => repo.GetJobsAsync())
                .ReturnsAsync(jobs);

            // Act
            var result = await _controller.GetJobs(null, null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedJobs = okResult.Value.Should().BeAssignableTo<IEnumerable<TranscodingJobResponse>>().Subject;
            returnedJobs.Should().HaveCount(2);
            returnedJobs.ElementAt(0).Id.Should().Be(jobs[0].Id);
            returnedJobs.ElementAt(1).Id.Should().Be(jobs[1].Id);
        }

        [Fact]
        public async Task GetJobs_WithStatusFilter_ReturnsFilteredJobs()
        {
            // Arrange
            var jobs = new List<TranscodingJob>
            {
                new TranscodingJob
                {
                    Id = Guid.NewGuid(),
                    VideoId = Guid.NewGuid(),
                    Status = JobStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    TenantId = "tenant1"
                },
                new TranscodingJob
                {
                    Id = Guid.NewGuid(),
                    VideoId = Guid.NewGuid(),
                    Status = JobStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    TenantId = "tenant2"
                }
            };

            _mockRepository.Setup(repo => repo.GetJobsAsync())
                .ReturnsAsync(jobs);

            // Act
            var result = await _controller.GetJobs("Completed", null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedJobs = okResult.Value.Should().BeAssignableTo<IEnumerable<TranscodingJobResponse>>().Subject;
            returnedJobs.Should().HaveCount(1);
            returnedJobs.ElementAt(0).Id.Should().Be(jobs[1].Id);
            returnedJobs.ElementAt(0).Status.Should().Be("Completed");
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
                Status = JobStatus.Completed,
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow,
                TenantId = "tenant1",
                InputPath = "input/path",
                OutputBasePath = "output/path"
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
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedJob = okResult.Value.Should().BeOfType<TranscodingJobDetailResponse>().Subject;
            returnedJob.Id.Should().Be(jobId);
            returnedJob.Status.Should().Be("Completed");
            returnedJob.Renditions.Should().HaveCount(1);
            returnedJob.Renditions.ElementAt(0).Resolution.Should().Be("720p");
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
            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetJobByVideoId_WithValidId_ReturnsOkResultWithJob()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var videoId = Guid.NewGuid();
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = videoId,
                Status = JobStatus.Processing,
                CreatedAt = DateTime.UtcNow,
                StartedAt = DateTime.UtcNow,
                TenantId = "tenant1",
                InputPath = "input/path",
                OutputBasePath = "output/path"
            };

            var renditions = new List<Rendition>
            {
                new Rendition
                {
                    Id = Guid.NewGuid(),
                    TranscodingJobId = jobId,
                    Resolution = "1080p",
                    Bitrate = 5000000,
                    Status = RenditionStatus.Processing,
                    CreatedAt = DateTime.UtcNow,
                    OutputPath = "output/path/1080p"
                }
            };

            _mockRepository.Setup(repo => repo.GetJobByVideoIdAsync(videoId))
                .ReturnsAsync(job);
            _mockRepository.Setup(repo => repo.GetRenditionsForJobAsync(jobId))
                .ReturnsAsync(renditions);

            // Act
            var result = await _controller.GetJobByVideoId(videoId);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedJob = okResult.Value.Should().BeOfType<TranscodingJobDetailResponse>().Subject;
            returnedJob.VideoId.Should().Be(videoId);
            returnedJob.Status.Should().Be("Processing");
            returnedJob.Renditions.Should().HaveCount(1);
            returnedJob.Renditions.ElementAt(0).Resolution.Should().Be("1080p");
        }

        [Fact]
        public async Task GetJobByVideoId_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            var videoId = Guid.NewGuid();
            _mockRepository.Setup(repo => repo.GetJobByVideoIdAsync(videoId))
                .ReturnsAsync((TranscodingJob)null);

            // Act
            var result = await _controller.GetJobByVideoId(videoId);

            // Assert
            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task GetJobRenditions_WithValidId_ReturnsOkResultWithRenditions()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = Guid.NewGuid(),
                Status = JobStatus.Completed,
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };

            var renditions = new List<Rendition>
            {
                new Rendition
                {
                    Id = Guid.NewGuid(),
                    TranscodingJobId = jobId,
                    Resolution = "480p",
                    Bitrate = 1000000,
                    Status = RenditionStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    OutputPath = "output/path/480p"
                },
                new Rendition
                {
                    Id = Guid.NewGuid(),
                    TranscodingJobId = jobId,
                    Resolution = "1080p",
                    Bitrate = 5000000,
                    Status = RenditionStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    OutputPath = "output/path/1080p"
                }
            };

            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
            _mockRepository.Setup(repo => repo.GetRenditionsForJobAsync(jobId))
                .ReturnsAsync(renditions);

            // Act
            var result = await _controller.GetJobRenditions(jobId);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedRenditions = okResult.Value.Should().BeAssignableTo<IEnumerable<RenditionResponse>>().Subject;
            returnedRenditions.Should().HaveCount(2);
            returnedRenditions.ElementAt(0).Resolution.Should().Be("480p");
            returnedRenditions.ElementAt(1).Resolution.Should().Be("1080p");
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
                Status = JobStatus.Processing,
                CreatedAt = DateTime.UtcNow,
                StartedAt = DateTime.UtcNow
            };

            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
            _mockTranscodingService.Setup(service => service.AbortJobAsync(jobId))
                .ReturnsAsync(true);

            // Act
            var result = await _controller.AbortJob(jobId);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            dynamic response = okResult.Value;
            ((string)response.message).Should().Be("Job aborted successfully");
        }

        [Fact]
        public async Task AbortJob_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync((TranscodingJob)null);

            // Act
            var result = await _controller.AbortJob(jobId);

            // Assert
            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task AbortJob_WithCompletedStatus_ReturnsBadRequest()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = Guid.NewGuid(),
                Status = JobStatus.Completed,
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };

            _mockRepository.Setup(repo => repo.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);

            // Act
            var result = await _controller.AbortJob(jobId);

            // Assert
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Cannot abort job with status Completed");
        }

        [Fact]
        public async Task GetStatistics_ReturnsOkResultWithCorrectStats()
        {
            // Arrange
            var jobs = new List<TranscodingJob>
            {
                new TranscodingJob { Status = JobStatus.Pending },
                new TranscodingJob { Status = JobStatus.Pending },
                new TranscodingJob { Status = JobStatus.Processing },
                new TranscodingJob { Status = JobStatus.Completed },
                new TranscodingJob { Status = JobStatus.Notified },
                new TranscodingJob { Status = JobStatus.Failed }
            };

            _mockRepository.Setup(repo => repo.GetJobsAsync())
                .ReturnsAsync(jobs);

            // Act
            var result = await _controller.GetStatistics();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var statistics = okResult.Value.Should().BeOfType<JobStatistics>().Subject;
            
            statistics.TotalJobs.Should().Be(6);
            statistics.PendingJobs.Should().Be(2);
            statistics.ProcessingJobs.Should().Be(1);
            statistics.CompletedJobs.Should().Be(2); // Completed + Notified
            statistics.FailedJobs.Should().Be(1);
        }

        [Fact]
        public async Task GetJobs_WhenExceptionOccurs_ReturnsStatusCode500()
        {
            // Arrange
            _mockRepository.Setup(repo => repo.GetJobsAsync())
                .ThrowsAsync(new Exception("Database error"));

            // Act
            var result = await _controller.GetJobs(null, null);

            // Assert
            var statusCodeResult = result.Should().BeOfType<ObjectResult>().Subject;
            statusCodeResult.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
        }
    }
}