using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Streamflix.Transcoding.Infrastructure.Services;
using System.IO;
using System.Threading.Tasks;
using Xunit;

namespace Streamflix.Transcoding.Tests.Services
{
    public class FFmpegServiceTests
    {
        private readonly Mock<ILogger<FFmpegService>> _loggerMock;
        private readonly FFmpegOptions _options;
        
        public FFmpegServiceTests()
        {
            _loggerMock = new Mock<ILogger<FFmpegService>>();
            _options = new FFmpegOptions
            {
                FFmpegPath = "",
                AutoDownload = true,
                FFmpegDownloadFolder = Path.Combine(Path.GetTempPath(), "test-ffmpeg")
            };
        }
          [Fact]
        public void UpdateJobProgress_ShouldUpdateProgress()
        {
            // Arrange
            var optionsMock = new Mock<IOptions<FFmpegOptions>>();
            optionsMock.Setup(x => x.Value).Returns(_options);
            
            var ffmpegService = new FFmpegService(optionsMock.Object, _loggerMock.Object);
            var jobId = Guid.NewGuid();
            
            // Act
            ffmpegService.UpdateJobProgress(jobId, 0.5);
            var progress = ffmpegService.GetJobProgress(jobId);
            
            // Assert
            Assert.Equal(0.5, progress);
        }
          [Fact]
        public void RemoveJobProgress_ShouldRemoveProgressTracking()
        {
            // Arrange
            var optionsMock = new Mock<IOptions<FFmpegOptions>>();
            optionsMock.Setup(x => x.Value).Returns(_options);
            
            var ffmpegService = new FFmpegService(optionsMock.Object, _loggerMock.Object);
            var jobId = Guid.NewGuid();
            
            // Act
            ffmpegService.UpdateJobProgress(jobId, 0.75);
            ffmpegService.RemoveJobProgress(jobId);
            var progress = ffmpegService.GetJobProgress(jobId);
            
            // Assert
            Assert.Equal(0, progress);
        }
        
        // Note: Testing InitializeAsync would require mocking FFmpeg.SetExecutablesPath
        // and FFmpegDownloader.GetLatestVersion which are static methods.
        // This would require a wrapper or abstraction layer that we don't have yet.
    }
}
