using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using MassTransit;
using Microsoft.Extensions.Logging;
using Moq;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Worker.Consumers;
using Xunit;

namespace Streamflix.Transcoding.Tests.Consumers
{
    public class VideoUploadedConsumerTests
    {
        private readonly Mock<ITranscodingService> _mockTranscodingService;
        private readonly Mock<ILogger<VideoUploadedConsumer>> _mockLogger;
        private readonly VideoUploadedConsumer _consumer;
        private readonly Mock<ConsumeContext<VideoUploadedEvent>> _mockConsumeContext;

        public VideoUploadedConsumerTests()
        {
            _mockTranscodingService = new Mock<ITranscodingService>();
            _mockLogger = new Mock<ILogger<VideoUploadedConsumer>>();
            _consumer = new VideoUploadedConsumer(_mockTranscodingService.Object, _mockLogger.Object);
            _mockConsumeContext = new Mock<ConsumeContext<VideoUploadedEvent>>();
        }

        [Fact]
        public async Task Consume_WithValidVideoEvent_ProcessesSuccessfully()
        {
            // Arrange
            var videoId = Guid.NewGuid();
            var messageId = Guid.NewGuid();
            var correlationId = Guid.NewGuid();
            var event1 = new VideoUploadedEvent
            {
                VideoId = videoId,
                InputPath = "s3://videos/input.mp4",
                FileName = "input.mp4",
                FileSize = 1024 * 1024 * 50, // 50MB
                ContentType = "video/mp4",
                TenantId = "tenant1",
                Metadata = new Dictionary<string, string>
                {
                    { "user", "user123" },
                    { "title", "Sample Video" }
                }
            };

            var job = new TranscodingJob
            {
                Id = Guid.NewGuid(),
                VideoId = videoId,
                Status = JobStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _mockConsumeContext.Setup(c => c.Message).Returns(event1);
            _mockConsumeContext.Setup(c => c.MessageId).Returns(messageId);
            _mockConsumeContext.Setup(c => c.CorrelationId).Returns(correlationId);

            _mockTranscodingService.Setup(s => s.ProcessVideoAsync(It.IsAny<VideoUploadedEvent>()))
                .ReturnsAsync(job);

            // Act
            await _consumer.Consume(_mockConsumeContext.Object);

            // Assert
            _mockTranscodingService.Verify(s => s.ProcessVideoAsync(It.Is<VideoUploadedEvent>(e => 
                e.VideoId == videoId && 
                e.InputPath == "s3://videos/input.mp4")), Times.Once);
        }

        [Fact]
        public async Task Consume_WithDuplicateEvent_HandlesGracefully()
        {
            // Arrange
            var videoId = Guid.NewGuid();
            var event1 = new VideoUploadedEvent
            {
                VideoId = videoId,
                InputPath = "s3://videos/input.mp4",
                TenantId = "tenant1"
            };

            _mockConsumeContext.Setup(c => c.Message).Returns(event1);
            _mockConsumeContext.Setup(c => c.MessageId).Returns(Guid.NewGuid());

            // Simulate a lock exception (video already being processed)
            _mockTranscodingService.Setup(s => s.ProcessVideoAsync(It.IsAny<VideoUploadedEvent>()))
                .ThrowsAsync(new InvalidOperationException("Could not acquire lock for video ID"));

            // Act & Assert
            await _consumer.Consume(_mockConsumeContext.Object);

            // The test passes if no exception is thrown, as the consumer should handle this case
            _mockTranscodingService.Verify(s => s.ProcessVideoAsync(It.IsAny<VideoUploadedEvent>()), Times.Once);
        }

        [Fact]
        public async Task Consume_WithTransientError_RethrowsForRetry()
        {
            // Arrange
            var videoId = Guid.NewGuid();
            var event1 = new VideoUploadedEvent
            {
                VideoId = videoId,
                InputPath = "s3://videos/input.mp4",
                TenantId = "tenant1"
            };

            _mockConsumeContext.Setup(c => c.Message).Returns(event1);
            _mockConsumeContext.Setup(c => c.MessageId).Returns(Guid.NewGuid());

            // Simulate a transient error like timeout
            _mockTranscodingService.Setup(s => s.ProcessVideoAsync(It.IsAny<VideoUploadedEvent>()))
                .ThrowsAsync(new TimeoutException("Connection timed out"));

            // Act & Assert
            await Assert.ThrowsAsync<TimeoutException>(() => _consumer.Consume(_mockConsumeContext.Object));

            _mockTranscodingService.Verify(s => s.ProcessVideoAsync(It.IsAny<VideoUploadedEvent>()), Times.Once);
        }

        [Fact]
        public async Task Consume_WithCriticalError_PublishesFailureEvent()
        {
            // Arrange
            var videoId = Guid.NewGuid();
            var event1 = new VideoUploadedEvent
            {
                VideoId = videoId,
                InputPath = "s3://videos/input.mp4",
                TenantId = "tenant1"
            };

            _mockConsumeContext.Setup(c => c.Message).Returns(event1);
            _mockConsumeContext.Setup(c => c.MessageId).Returns(Guid.NewGuid());

            // Simulate a critical error
            _mockTranscodingService.Setup(s => s.ProcessVideoAsync(It.IsAny<VideoUploadedEvent>()))
                .ThrowsAsync(new ArgumentException("Invalid video format"));

            // Set up to capture the published failure event
            _mockConsumeContext.Setup(c => c.Publish(It.IsAny<VideoProcessingFailedEvent>(), default))
                .Returns(Task.CompletedTask);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _consumer.Consume(_mockConsumeContext.Object));

            // Verify that a failure event was published
            _mockConsumeContext.Verify(c => c.Publish(It.Is<VideoProcessingFailedEvent>(e => 
                e.VideoId == videoId &&
                e.ExceptionType == "ArgumentException"), 
                default), Times.Once);
        }
    }
}