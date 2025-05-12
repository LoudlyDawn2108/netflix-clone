using Microsoft.Extensions.Logging;
using Moq;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Infrastructure.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Streamflix.Transcoding.Tests.Integration
{
    // This test requires FFmpeg to be installed or available for download
    // Mark these tests as explicit so they don't run in CI by default
    [Trait("Category", "Integration")]
    public class FFmpegTranscoderIntegrationTests : IDisposable
    {
        private readonly FFmpegService _ffmpegService;
        private readonly FFmpegTranscoder _transcoder;
        private readonly string _testDir;
        private readonly string _sampleVideoPath;

        public FFmpegTranscoderIntegrationTests()
        {
            // Create test directory and sample video file
            _testDir = Path.Combine(Path.GetTempPath(), "streamflix-test-" + Guid.NewGuid().ToString());
            Directory.CreateDirectory(_testDir);

            // Configure FFmpeg services
            var loggerMock = new Mock<ILogger<FFmpegService>>();
            var transcoderLoggerMock = new Mock<ILogger<FFmpegTranscoder>>();
            
            // Create FFmpeg options
            var ffmpegOptions = new FFmpegOptions
            {
                AutoDownload = true,
                FFmpegDownloadFolder = Path.Combine(_testDir, "ffmpeg")
            };
            
            var optionsMock = new Mock<Microsoft.Extensions.Options.IOptions<FFmpegOptions>>();
            optionsMock.Setup(x => x.Value).Returns(ffmpegOptions);
            
            _ffmpegService = new FFmpegService(optionsMock.Object, loggerMock.Object);
            _transcoder = new FFmpegTranscoder(_ffmpegService, transcoderLoggerMock.Object);
            
            // Create a simple test video file (may need to be created if you want this test to run)
            _sampleVideoPath = Path.Combine(_testDir, "sample.mp4");
        }

        [Fact(Skip = "Integration test requiring FFmpeg installation")]
        public async Task TranscodeVideoAsync_ShouldCreateRenditions()
        {
            // Arrange
            // Note: This test requires a sample video file to exist
            if (!File.Exists(_sampleVideoPath))
            {
                // Skip test if sample video doesn't exist
                return;
            }

            var jobId = Guid.NewGuid();
            var outputDir = Path.Combine(_testDir, "output");
            Directory.CreateDirectory(outputDir);
            
            // Use a simplified version of profiles for testing
            var profiles = new List<ITranscodingProfile>
            {
                new TranscodingProfile
                {
                    Name = "480p",
                    Resolution = "480p",
                    Width = 854,
                    Height = 480,
                    Bitrate = 1000000,
                    VideoCodec = "libx264",
                    AudioCodec = "aac",
                    Preset = "ultrafast", // Use ultrafast for testing
                    AdditionalParameters = new[] { "-profile:v baseline" }
                }
            };

            // Act
            var result = await _transcoder.TranscodeVideoAsync(
                jobId,
                _sampleVideoPath,
                outputDir,
                profiles,
                3); // Short segments for testing

            // Assert
            Assert.NotEmpty(result);
            Assert.True(result.ContainsKey(profiles[0]));
            
            var outputFilePath = result[profiles[0]];
            Assert.True(File.Exists(outputFilePath), $"Output file {outputFilePath} should exist");
            
            // Check that segments were created
            var segmentFiles = Directory.GetFiles(Path.GetDirectoryName(outputFilePath), "*.ts");
            Assert.NotEmpty(segmentFiles);
        }

        [Fact(Skip = "Integration test requiring FFmpeg installation")]
        public async Task CreateHlsManifestAsync_ShouldCreateManifest()
        {
            // Arrange
            var renditionFiles = new Dictionary<ITranscodingProfile, string>
            {
                {
                    new TranscodingProfile
                    {
                        Name = "480p",
                        Resolution = "480p",
                        Width = 854,
                        Height = 480,
                        Bitrate = 1000000
                    },
                    Path.Combine(_testDir, "480p", "480p.m3u8")
                },
                {
                    new TranscodingProfile
                    {
                        Name = "720p",
                        Resolution = "720p",
                        Width = 1280,
                        Height = 720,
                        Bitrate = 2500000
                    },
                    Path.Combine(_testDir, "720p", "720p.m3u8")
                }
            };
            
            // Create directories and dummy files
            foreach (var path in renditionFiles.Values)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                File.WriteAllText(path, "#EXTM3U\n#EXT-X-VERSION:3\n");
            }
            
            // Act
            var manifestPath = await _transcoder.CreateHlsManifestAsync(renditionFiles, _testDir);
            
            // Assert
            Assert.True(File.Exists(manifestPath));
            var content = await File.ReadAllTextAsync(manifestPath);
            Assert.Contains("#EXTM3U", content);
            Assert.Contains("#EXT-X-STREAM-INF", content);
            Assert.Contains("480p.m3u8", content);
            Assert.Contains("720p.m3u8", content);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, true);
                }
            }
            catch
            {
                // Ignore cleanup errors
            }
        }
    }
}
