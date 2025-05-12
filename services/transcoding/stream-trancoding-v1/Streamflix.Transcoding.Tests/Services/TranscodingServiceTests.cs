using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;
using Streamflix.Transcoding.Infrastructure.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace Streamflix.Transcoding.Tests.Services
{
    public class TranscodingServiceTests
    {
        private readonly Mock<ITranscodingRepository> _repositoryMock;
        private readonly Mock<IS3StorageService> _s3StorageMock;
        private readonly Mock<IDistributedLockService> _lockServiceMock;
        private readonly Mock<FFmpegTranscoder> _ffmpegTranscoderMock;
        private readonly Mock<ILogger<TranscodingService>> _loggerMock;
        private readonly TranscodingServiceOptions _options;
        
        public TranscodingServiceTests()
        {
            _repositoryMock = new Mock<ITranscodingRepository>();
            _s3StorageMock = new Mock<IS3StorageService>();
            _lockServiceMock = new Mock<IDistributedLockService>();
            _ffmpegTranscoderMock = new Mock<FFmpegTranscoder>();
            _loggerMock = new Mock<ILogger<TranscodingService>>();
            
            _options = new TranscodingServiceOptions
            {
                TempDirectory = "test-temp",
                MaxConcurrentJobs = 2,
                OutputPathFormat = "test/{tenantId}/videos/{videoId}/{resolution}",
                ManifestFormat = "test/{tenantId}/videos/{videoId}/manifest.m3u8",
                DefaultProfiles = new[]
                {
                    new TranscodingProfile
                    {
                        Name = "480p",
                        Resolution = "480p",
                        Width = 854,
                        Height = 480,
                        Bitrate = 1000000
                    }
                }
            };
        }
        
        [Fact]
        public async Task ProcessVideoAsync_WithExistingJob_ReturnsExistingJob()
        {
            // Arrange
            var videoEvent = new VideoUploaded
            {
                VideoId = Guid.NewGuid(),
                FilePath = "path/to/source.mp4",
                TenantId = "tenant1"
            };
            
            var existingJob = new TranscodingJob
            {
                Id = Guid.NewGuid(),
                VideoId = videoEvent.VideoId,
                TenantId = videoEvent.TenantId,
                Status = TranscodingJobStatus.Processing
            };
            
            _lockServiceMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync(true);
                
            _repositoryMock.Setup(x => x.GetJobByVideoIdAsync(videoEvent.VideoId, videoEvent.TenantId))
                .ReturnsAsync(existingJob);
                
            var optionsMock = new Mock<IOptions<TranscodingServiceOptions>>();
            optionsMock.Setup(x => x.Value).Returns(_options);
            
            var transcodingService = new TranscodingService(
                _repositoryMock.Object,
                _s3StorageMock.Object,
                _lockServiceMock.Object,
                _ffmpegTranscoderMock.Object,
                optionsMock.Object,
                _loggerMock.Object);
                
            // Act
            var result = await transcodingService.ProcessVideoAsync(videoEvent);
            
            // Assert
            Assert.Same(existingJob, result);
            _repositoryMock.Verify(x => x.CreateJobAsync(It.IsAny<TranscodingJob>()), Times.Never);
        }
        
        [Fact]
        public async Task ProcessVideoAsync_WithNewVideo_CreatesNewJob()
        {
            // Arrange
            var videoEvent = new VideoUploaded
            {
                VideoId = Guid.NewGuid(),
                FilePath = "path/to/source.mp4",
                TenantId = "tenant1"
            };
            
            var newJob = new TranscodingJob
            {
                Id = Guid.NewGuid(),
                VideoId = videoEvent.VideoId,
                TenantId = videoEvent.TenantId,
                Status = TranscodingJobStatus.Received
            };
            
            _lockServiceMock.Setup(x => x.AcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()))
                .ReturnsAsync(true);
                
            _repositoryMock.Setup(x => x.GetJobByVideoIdAsync(videoEvent.VideoId, videoEvent.TenantId))
                .ReturnsAsync((TranscodingJob)null);
                
            _repositoryMock.Setup(x => x.CreateJobAsync(It.IsAny<TranscodingJob>()))
                .ReturnsAsync(newJob);
                
            // Set up S3 storage to return a local file path when downloading
            _s3StorageMock.Setup(x => x.DownloadFileAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync("local/path/source.mp4");
                
            // Set up FFmpeg transcoder to return some output files
            _ffmpegTranscoderMock.Setup(x => x.TranscodeVideoAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IEnumerable<ITranscodingProfile>>(),
                    It.IsAny<int>(),
                    default))
                .ReturnsAsync(new Dictionary<ITranscodingProfile, string>
                {
                    { _options.DefaultProfiles[0], "local/path/output/480p/480p.m3u8" }
                });
                
            // Set up HLS manifest creation
            _ffmpegTranscoderMock.Setup(x => x.CreateHlsManifestAsync(
                    It.IsAny<Dictionary<ITranscodingProfile, string>>(),
                    It.IsAny<string>()))
                .ReturnsAsync("local/path/output/master.m3u8");
                
            // Set up S3 upload to return true
            _s3StorageMock.Setup(x => x.UploadFileAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<IDictionary<string, string>>()))
                .ReturnsAsync(true);
                
            var optionsMock = new Mock<IOptions<TranscodingServiceOptions>>();
            optionsMock.Setup(x => x.Value).Returns(_options);
            
            var transcodingService = new TranscodingService(
                _repositoryMock.Object,
                _s3StorageMock.Object,
                _lockServiceMock.Object,
                _ffmpegTranscoderMock.Object,
                optionsMock.Object,
                _loggerMock.Object);
                
            // Act
            var result = await transcodingService.ProcessVideoAsync(videoEvent);
            
            // Assert
            Assert.Same(newJob, result);
            _repositoryMock.Verify(x => x.CreateJobAsync(It.IsAny<TranscodingJob>()), Times.Once);
        }
        
        [Fact]
        public async Task GenerateTranscodedEventAsync_WithCompletedJob_ReturnsEvent()
        {
            // Arrange
            var jobId = Guid.NewGuid();
            var videoId = Guid.NewGuid();
            var tenantId = "tenant1";
            
            var job = new TranscodingJob
            {
                Id = jobId,
                VideoId = videoId,
                TenantId = tenantId,
                Status = TranscodingJobStatus.Completed,
                OutputManifestS3Path = "test/tenant1/videos/" + videoId + "/manifest.m3u8",
                CreatedAt = DateTime.UtcNow.AddMinutes(-5)
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
                    OutputPath = "test/tenant1/videos/" + videoId + "/480p/480p.m3u8"
                }
            };
            
            _repositoryMock.Setup(x => x.GetJobByIdAsync(jobId))
                .ReturnsAsync(job);
                
            _repositoryMock.Setup(x => x.GetRenditionsForJobAsync(jobId))
                .ReturnsAsync(renditions);
                
            var optionsMock = new Mock<IOptions<TranscodingServiceOptions>>();
            optionsMock.Setup(x => x.Value).Returns(_options);
            
            var transcodingService = new TranscodingService(
                _repositoryMock.Object,
                _s3StorageMock.Object,
                _lockServiceMock.Object,
                _ffmpegTranscoderMock.Object,
                optionsMock.Object,
                _loggerMock.Object);
                
            // Act
            var result = await transcodingService.GenerateTranscodedEventAsync(jobId);
            
            // Assert
            Assert.NotNull(result);
            Assert.Equal(jobId, result.JobId);
            Assert.Equal(videoId, result.VideoId);
            Assert.Equal(tenantId, result.TenantId);
            Assert.True(result.Success);
            Assert.Equal(job.OutputManifestS3Path, result.ManifestUrl);
            Assert.NotEmpty(result.OutputDetails);
        }
    }
}
