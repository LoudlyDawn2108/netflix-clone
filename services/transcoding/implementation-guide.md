# Transcoding Service Development Guide

This guide provides instructions on how to implement the Streamflix Transcoding Service step-by-step, allowing an AI agent to build the service efficiently within context window limitations.

## Development Approach

To build the Transcoding Service effectively, follow this incremental development approach:

1. **Start with a minimal viable implementation** that covers the core functionality
2. **Add features incrementally** in order of priority
3. **Test thoroughly** after each increment
4. **Document as you go** to maintain context across development sessions

## Getting Started

### Prerequisites

- .NET 8 SDK
- Docker and Docker Compose
- FFmpeg (for local development)
- PostgreSQL (or Docker container)
- Kafka (or Docker container)
- AWS S3 compatible storage (or LocalStack for development)

### Initial Setup Steps

1. Create a new .NET 8 Worker Service project:

   ```
   dotnet new worker -n StreamTranscoding
   ```

2. Add essential NuGet packages:

   ```
   dotnet add package Microsoft.EntityFrameworkCore.PostgreSQL
   dotnet add package MassTransit.Kafka
   dotnet add package Xabe.FFmpeg
   dotnet add package AWSSDK.S3
   dotnet add package Serilog.AspNetCore
   dotnet add package Polly
   ```

3. Setup project structure with the following folders:
   - `/Controllers` - API endpoints
   - `/Services` - Business logic services
   - `/Models` - Data models and DTOs
   - `/Data` - Database context and repositories
   - `/Messaging` - Kafka message handlers
   - `/Transcoding` - FFmpeg and transcoding logic
   - `/Storage` - S3 integration

## Implementation Steps

### Step 1: Core Service Setup

1. Create the Worker service template in `Program.cs`:

   ```csharp
   using Microsoft.Extensions.DependencyInjection;
   using Microsoft.Extensions.Hosting;
   using Serilog;

   var host = Host.CreateDefaultBuilder(args)
       .ConfigureServices((hostContext, services) =>
       {
           services.AddHostedService<Worker>();
       })
       .UseSerilog((context, configuration) => configuration
           .ReadFrom.Configuration(context.Configuration))
       .Build();

   await host.RunAsync();
   ```

2. Create database context and models:

   ```csharp
   // Models/TranscodingJob.cs
   public class TranscodingJob
   {
       public Guid Id { get; set; }
       public Guid VideoId { get; set; }
       public string Status { get; set; }
       public string InputPath { get; set; }
       public string OutputBasePath { get; set; }
       public DateTime CreatedAt { get; set; }
       public DateTime UpdatedAt { get; set; }
       public DateTime? CompletedAt { get; set; }
       // Additional properties
   }

   // Data/AppDbContext.cs
   public class AppDbContext : DbContext
   {
       public DbSet<TranscodingJob> TranscodingJobs { get; set; }
       // ...
   }
   ```

3. Configure Entity Framework in `Program.cs`:

   ```csharp
   services.AddDbContext<AppDbContext>(options =>
       options.UseNpgsql(
           hostContext.Configuration.GetConnectionString("DefaultConnection"),
           npgsqlOptions => npgsqlOptions.EnableRetryOnFailure())
           .UseSnakeCaseNamingConvention());
   ```

4. Set up dependency injection for services:
   ```csharp
   services.AddScoped<ITranscodingService, TranscodingService>();
   services.AddScoped<IStorageService, S3StorageService>();
   services.AddScoped<IJobRepository, JobRepository>();
   ```

### Step 2: Message Handling Setup

1. Configure MassTransit with Kafka:

   ```csharp
   services.AddMassTransit(x =>
   {
       x.UsingInMemory((context, cfg) => cfg.ConfigureEndpoints(context));

       x.AddRider(rider =>
       {
           rider.AddConsumer<VideoUploadedConsumer>();

           rider.UsingKafka((context, k) =>
           {
               k.Host(hostContext.Configuration["Kafka:BootstrapServers"]);

               k.TopicEndpoint<VideoUploaded>(
                   "video-service.video-uploaded",
                   hostContext.Configuration["Kafka:ConsumerGroup"],
                   e =>
                   {
                       e.ConfigureConsumer<VideoUploadedConsumer>(context);
                   });
           });
       });
   });
   ```

2. Create message models:

   ```csharp
   // Messaging/Models/VideoUploaded.cs
   public class VideoUploaded
   {
       public Guid VideoId { get; set; }
       public Guid TenantId { get; set; }
       public string S3Path { get; set; }
       public string Filename { get; set; }
       public long FileSize { get; set; }
       public string MimeType { get; set; }
       public VideoMetadata Metadata { get; set; }
       public string RequestId { get; set; }
       public DateTime Timestamp { get; set; }
   }

   public class VideoMetadata
   {
       public float Duration { get; set; }
       public string OriginalResolution { get; set; }
       public bool HasAudio { get; set; }
   }
   ```

3. Implement message consumer:

   ```csharp
   // Messaging/Consumers/VideoUploadedConsumer.cs
   public class VideoUploadedConsumer : IConsumer<VideoUploaded>
   {
       private readonly ITranscodingService _transcodingService;
       private readonly ILogger<VideoUploadedConsumer> _logger;

       public VideoUploadedConsumer(
           ITranscodingService transcodingService,
           ILogger<VideoUploadedConsumer> logger)
       {
           _transcodingService = transcodingService;
           _logger = logger;
       }

       public async Task Consume(ConsumeContext<VideoUploaded> context)
       {
           _logger.LogInformation("Received VideoUploaded event for VideoId: {VideoId}",
               context.Message.VideoId);

           await _transcodingService.CreateTranscodingJobAsync(context.Message);
       }
   }
   ```

### Step 3: Transcoding Service Implementation

1. Define service interface:

   ```csharp
   // Services/ITranscodingService.cs
   public interface ITranscodingService
   {
       Task<Guid> CreateTranscodingJobAsync(VideoUploaded message);
       Task ProcessJobAsync(Guid jobId);
       Task<TranscodingJob> GetJobStatusAsync(Guid jobId);
   }
   ```

2. Implement the service:

   ```csharp
   // Services/TranscodingService.cs
   public class TranscodingService : ITranscodingService
   {
       private readonly IJobRepository _jobRepository;
       private readonly IStorageService _storageService;
       private readonly ILogger<TranscodingService> _logger;

       // Constructor with dependency injection

       public async Task<Guid> CreateTranscodingJobAsync(VideoUploaded message)
       {
           // Create job record in database
           // Return job ID
       }

       public async Task ProcessJobAsync(Guid jobId)
       {
           // Download source file
           // Process transcoding
           // Upload renditions
           // Generate manifests
           // Update job status
           // Publish completion event
       }

       // Additional methods
   }
   ```

3. Implement FFmpeg wrapper:
   ```csharp
   // Transcoding/FFmpegService.cs
   public class FFmpegService : IFFmpegService
   {
       private readonly ILogger<FFmpegService> _logger;

       public FFmpegService(ILogger<FFmpegService> logger)
       {
           _logger = logger;
       }

       public async Task<bool> TranscodeAsync(
           string inputPath,
           string outputPath,
           string resolution,
           int bitrate)
       {
           try
           {
               var conversion = await FFmpeg.Conversions.FromSnippet.Convert(
                   inputPath,
                   outputPath,
                   VideoSize.Custom(resolution),
                   AudioQuality.Medium);

               conversion.SetVideoBitrate(bitrate);

               await conversion.Start();

               return true;
           }
           catch (Exception ex)
           {
               _logger.LogError(ex, "Transcoding failed for {InputPath}", inputPath);
               return false;
           }
       }

       // Additional methods for different profiles
   }
   ```

### Step 4: Storage Integration

1. Define storage service interface:

   ```csharp
   // Storage/IStorageService.cs
   public interface IStorageService
   {
       Task<string> DownloadFileAsync(string s3Path, string localPath);
       Task<bool> UploadFileAsync(string localPath, string s3Path);
       Task<List<string>> ListFilesAsync(string prefix);
       Task<bool> FileExistsAsync(string s3Path);
   }
   ```

2. Implement S3 storage service:
   ```csharp
   // Storage/S3StorageService.cs
   public class S3StorageService : IStorageService
   {
       private readonly IAmazonS3 _s3Client;
       private readonly ILogger<S3StorageService> _logger;
       private readonly string _bucketName;

       public S3StorageService(
           IAmazonS3 s3Client,
           IConfiguration configuration,
           ILogger<S3StorageService> logger)
       {
           _s3Client = s3Client;
           _logger = logger;
           _bucketName = configuration["AWS:BucketName"];
       }

       public async Task<string> DownloadFileAsync(string s3Path, string localPath)
       {
           // Implement download logic
       }

       public async Task<bool> UploadFileAsync(string localPath, string s3Path)
       {
           // Implement upload logic using TransferUtility for large files
       }

       // Additional methods
   }
   ```

### Step 5: Job Processing Worker

1. Create job processing worker:
   ```csharp
   // Workers/TranscodingWorker.cs
   public class TranscodingWorker : BackgroundService
   {
       private readonly IServiceProvider _serviceProvider;
       private readonly ILogger<TranscodingWorker> _logger;
       private readonly IConfiguration _configuration;

       public TranscodingWorker(
           IServiceProvider serviceProvider,
           IConfiguration configuration,
           ILogger<TranscodingWorker> logger)
       {
           _serviceProvider = serviceProvider;
           _configuration = configuration;
           _logger = logger;
       }

       protected override async Task ExecuteAsync(CancellationToken stoppingToken)
       {
           while (!stoppingToken.IsCancellationRequested)
           {
               using (var scope = _serviceProvider.CreateScope())
               {
                   var jobRepository = scope.ServiceProvider
                       .GetRequiredService<IJobRepository>();
                   var transcodingService = scope.ServiceProvider
                       .GetRequiredService<ITranscodingService>();

                   var pendingJobs = await jobRepository
                       .GetPendingJobsAsync(10);

                   foreach (var job in pendingJobs)
                   {
                       try
                       {
                           await transcodingService.ProcessJobAsync(job.Id);
                       }
                       catch (Exception ex)
                       {
                           _logger.LogError(ex,
                               "Error processing job {JobId}", job.Id);
                       }
                   }
               }

               await Task.Delay(
                   _configuration.GetValue<int>("Worker:PollingIntervalMs"),
                   stoppingToken);
           }
       }
   }
   ```

## Advanced Features Implementation

### Distributed Locking with Redis

```csharp
// Services/IDistributedLockService.cs
public interface IDistributedLockService
{
    Task<bool> AcquireLockAsync(string key, TimeSpan expiry);
    Task ReleaseLockAsync(string key);
}

// Services/RedisLockService.cs
public class RedisLockService : IDistributedLockService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisLockService> _logger;

    public RedisLockService(
        IConnectionMultiplexer redis,
        ILogger<RedisLockService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<bool> AcquireLockAsync(string key, TimeSpan expiry)
    {
        var db = _redis.GetDatabase();
        return await db.StringSetAsync($"lock:{key}", "1", expiry, When.NotExists);
    }

    public async Task ReleaseLockAsync(string key)
    {
        var db = _redis.GetDatabase();
        await db.KeyDeleteAsync($"lock:{key}");
    }
}
```

### Retry Policy with Polly

```csharp
// Configure in Program.cs
services.AddSingleton<IAsyncPolicy>(provider =>
{
    return Policy
        .Handle<Exception>()
        .WaitAndRetryAsync(
            3,
            retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            (exception, timeSpan, retryCount, context) =>
            {
                var logger = provider.GetService<ILogger<Program>>();
                logger.LogWarning(exception,
                    "Retry {RetryCount} after {RetryDelay}s",
                    retryCount, timeSpan.TotalSeconds);
            }
        );
});
```

### HLS/DASH Manifest Generation

```csharp
// Transcoding/ManifestGenerator.cs
public class ManifestGenerator : IManifestGenerator
{
    public async Task<string> GenerateHlsManifestAsync(
        List<RenditionInfo> renditions,
        string baseUrl)
    {
        var manifest = new StringBuilder();
        manifest.AppendLine("#EXTM3U");
        manifest.AppendLine("#EXT-X-VERSION:3");

        foreach (var rendition in renditions)
        {
            manifest.AppendLine($"#EXT-X-STREAM-INF:BANDWIDTH={rendition.Bitrate*1000},RESOLUTION={rendition.Resolution}");
            manifest.AppendLine($"{baseUrl}/{rendition.Resolution}/playlist.m3u8");
        }

        return manifest.ToString();
    }

    public async Task<string> GenerateDashManifestAsync(
        List<RenditionInfo> renditions,
        string baseUrl)
    {
        // DASH manifest implementation
    }
}
```

## Testing Implementation

### Unit Tests Example

```csharp
// Tests/TranscodingServiceTests.cs
public class TranscodingServiceTests
{
    private readonly Mock<IJobRepository> _mockRepository;
    private readonly Mock<IStorageService> _mockStorage;
    private readonly Mock<IFFmpegService> _mockFfmpeg;
    private readonly TranscodingService _service;

    public TranscodingServiceTests()
    {
        _mockRepository = new Mock<IJobRepository>();
        _mockStorage = new Mock<IStorageService>();
        _mockFfmpeg = new Mock<IFFmpegService>();

        _service = new TranscodingService(
            _mockRepository.Object,
            _mockStorage.Object,
            _mockFfmpeg.Object,
            Mock.Of<ILogger<TranscodingService>>());
    }

    [Fact]
    public async Task CreateTranscodingJob_ShouldCreateNewJob_WhenValidMessageProvided()
    {
        // Arrange
        var message = new VideoUploaded
        {
            VideoId = Guid.NewGuid(),
            S3Path = "test/path.mp4",
            RequestId = "request123"
        };

        _mockRepository
            .Setup(r => r.GetJobByRequestIdAsync(message.RequestId))
            .ReturnsAsync((TranscodingJob)null);

        _mockRepository
            .Setup(r => r.CreateJobAsync(It.IsAny<TranscodingJob>()))
            .ReturnsAsync((TranscodingJob job) => job.Id);

        // Act
        var result = await _service.CreateTranscodingJobAsync(message);

        // Assert
        Assert.NotEqual(Guid.Empty, result);
        _mockRepository.Verify(
            r => r.CreateJobAsync(It.IsAny<TranscodingJob>()),
            Times.Once);
    }

    // Additional tests
}
```

### Integration Tests Example

```csharp
// Tests/IntegrationTests/S3StorageServiceTests.cs
public class S3StorageServiceTests : IClassFixture<LocalStackFixture>
{
    private readonly LocalStackFixture _fixture;
    private readonly S3StorageService _service;

    public S3StorageServiceTests(LocalStackFixture fixture)
    {
        _fixture = fixture;

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string>
            {
                ["AWS:BucketName"] = "test-bucket"
            })
            .Build();

        _service = new S3StorageService(
            _fixture.S3Client,
            configuration,
            Mock.Of<ILogger<S3StorageService>>());
    }

    [Fact]
    public async Task UploadFileAsync_ShouldUploadFile_WhenFileExists()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, "test content");
        var s3Path = "test/upload.txt";

        try
        {
            // Act
            var result = await _service.UploadFileAsync(tempFile, s3Path);

            // Assert
            Assert.True(result);
            Assert.True(await _service.FileExistsAsync(s3Path));
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    // Additional tests
}
```

## Docker and Kubernetes Configuration

### Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["StreamTranscoding.csproj", "."]
RUN dotnet restore "./StreamTranscoding.csproj"
COPY . .
RUN dotnet build "StreamTranscoding.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "StreamTranscoding.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "StreamTranscoding.dll"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transcoding-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: transcoding-service
  template:
    metadata:
      labels:
        app: transcoding-service
    spec:
      containers:
        - name: transcoding-service
          image: streamflix/transcoding-service:latest
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2"
          env:
            - name: ConnectionStrings__DefaultConnection
              valueFrom:
                secretKeyRef:
                  name: transcoding-secrets
                  key: db-connection
            - name: Kafka__BootstrapServers
              value: "kafka:9092"
            - name: AWS__AccessKey
              valueFrom:
                secretKeyRef:
                  name: transcoding-secrets
                  key: aws-access-key
            - name: AWS__SecretKey
              valueFrom:
                secretKeyRef:
                  name: transcoding-secrets
                  key: aws-secret-key
            - name: AWS__BucketName
              value: "streamflix-videos"
          ports:
            - containerPort: 80
          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 30
```

By following this development guide, your AI agent can implement the Transcoding Service incrementally, ensuring a complete solution that meets all the specified requirements.
