using System.Threading.Tasks.Dataflow;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;

namespace Streamflix.Transcoding.Infrastructure.Services;

public class TranscodingServiceOptions
{
    public string TempDirectory { get; set; } = Path.Combine(Path.GetTempPath(), "streamflix-transcoding");
    public int MaxConcurrentJobs { get; set; } = 2;
    public int MaxConcurrentRenditions { get; set; } = 3;
    public string OutputBaseDirectory { get; set; } = "transcoded";
    public string OutputPathFormat { get; set; } = "{tenantId}/videos/{videoId}/{resolution}";
    public string ManifestFormat { get; set; } = "{tenantId}/videos/{videoId}/manifest.m3u8";
    public bool AutoDownloadFFmpeg { get; set; } = true;
}

public class TranscodingService : ITranscodingService
{
    private readonly ITranscodingRepository _repository;
    private readonly IS3StorageService _storageService;
    private readonly IDistributedLockService _lockService;
    private readonly ILogger<TranscodingService> _logger;
    private readonly TranscodingServiceOptions _options;
    private readonly SemaphoreSlim _jobSemaphore;
    
    private static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(5);
    
    public TranscodingService(
        ITranscodingRepository repository,
        IS3StorageService storageService,
        IDistributedLockService lockService,
        IOptions<TranscodingServiceOptions> options,
        ILogger<TranscodingService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _storageService = storageService ?? throw new ArgumentNullException(nameof(storageService));
        _lockService = lockService ?? throw new ArgumentNullException(nameof(lockService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _jobSemaphore = new SemaphoreSlim(_options.MaxConcurrentJobs, _options.MaxConcurrentJobs);
        
        // Ensure the temp directory exists
        Directory.CreateDirectory(_options.TempDirectory);
        
        // Auto download FFmpeg if configured
        if (_options.AutoDownloadFFmpeg)
        {
            Task.Run(async () => 
            {
                try 
                {
                    _logger.LogInformation("Auto-downloading FFmpeg...");
                    await FFmpegDownloader.GetLatestVersion(FFmpegVersion.Official);
                    _logger.LogInformation("FFmpeg downloaded successfully");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to download FFmpeg");
                }
            });
        }
    }
    
    public async Task<TranscodingJob> ProcessVideoAsync(VideoUploadedEvent videoEvent)
    {
        if (videoEvent == null) throw new ArgumentNullException(nameof(videoEvent));
        
        string lockKey = $"video:{videoEvent.VideoId}";
        
        try
        {
            // Try to acquire a lock for this video ID
            bool lockAcquired = await _lockService.AcquireLockAsync(lockKey, LockDuration);
            
            if (!lockAcquired)
            {
                _logger.LogWarning("Could not acquire lock for video ID: {VideoId}. It might be already processing", 
                    videoEvent.VideoId);
                
                // Check if job exists and return it
                var existingJob = await _repository.GetJobByVideoIdAsync(videoEvent.VideoId);
                if (existingJob != null)
                {
                    _logger.LogInformation("Found existing job for video ID: {VideoId}, status: {Status}", 
                        videoEvent.VideoId, existingJob.Status);
                    return existingJob;
                }
                
                throw new InvalidOperationException($"Could not acquire lock for video ID: {videoEvent.VideoId} and no existing job found");
            }
            
            // Check if there's already a job for this video
            var job = await _repository.GetJobByVideoIdAsync(videoEvent.VideoId);
            
            if (job != null)
            {
                _logger.LogInformation("Job already exists for video ID: {VideoId}, status: {Status}", 
                    videoEvent.VideoId, job.Status);
                
                // Release the lock since we're not doing anything
                await _lockService.ReleaseLockAsync(lockKey);
                return job;
            }
            
            // Create new job
            var outputBasePath = FormatOutputPath(videoEvent.VideoId.ToString(), videoEvent.TenantId);
            
            job = new TranscodingJob
            {
                Id = Guid.NewGuid(),
                VideoId = videoEvent.VideoId,
                InputPath = videoEvent.InputPath,
                OutputBasePath = outputBasePath,
                Status = JobStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                TenantId = videoEvent.TenantId
            };
            
            // Save the job
            job = await _repository.CreateJobAsync(job);
            _logger.LogInformation("Created new transcoding job with ID: {JobId} for video ID: {VideoId}", 
                job.Id, job.VideoId);
            
            // Process the job asynchronously
            _ = Task.Run(async () => 
            {
                try 
                {
                    await _jobSemaphore.WaitAsync();
                    
                    try
                    {
                        // Keep extending the lock while processing
                        using var timer = new Timer(
                            async _ => await _lockService.ExtendLockAsync(lockKey, LockDuration),
                            null, 
                            TimeSpan.Zero, 
                            TimeSpan.FromMinutes(1));
                        
                        await ProcessJobInternalAsync(job);
                    }
                    finally
                    {
                        _jobSemaphore.Release();
                        await _lockService.ReleaseLockAsync(lockKey);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing job {JobId} for video {VideoId}", 
                        job.Id, job.VideoId);
                        
                    await _repository.UpdateJobStatusAsync(job.Id, JobStatus.Failed, ex.Message);
                    await _lockService.ReleaseLockAsync(lockKey);
                }
            });
            
            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting transcoding job for video ID: {VideoId}", videoEvent.VideoId);
            await _lockService.ReleaseLockAsync(lockKey);
            throw;
        }
    }
    
    private async Task ProcessJobInternalAsync(TranscodingJob job)
    {
        // Download the input file
        var localInputPath = await DownloadInputFileAsync(job.InputPath);
        
        try
        {
            // Update job status to processing
            await _repository.UpdateJobStatusAsync(job.Id, JobStatus.Processing);
            
            // Get media info from the input file
            var mediaInfo = await FFmpeg.GetMediaInfo(localInputPath);
            
            // Create the renditions
            var renditions = new List<Rendition>();
            var transcodingProfiles = PredefinedProfiles.DefaultProfiles;
            
            // Setup the dataflow pipeline for parallel processing of renditions
            var executionOptions = new ExecutionDataflowBlockOptions
            {
                MaxDegreeOfParallelism = _options.MaxConcurrentRenditions
            };
            
            var transcodeBlock = new TransformBlock<(ITranscodingProfile Profile, TranscodingJob Job, string InputPath), Rendition>(
                async input =>
                {
                    return await TranscodeRenditionAsync(input.Profile, input.Job, input.InputPath, mediaInfo);
                },
                executionOptions);
            
            // Add each profile to the pipeline
            foreach (var profile in transcodingProfiles)
            {
                transcodeBlock.Post((profile, job, localInputPath));
            }
            
            // Mark the block as complete
            transcodeBlock.Complete();
            
            // Collect the renditions
            while (await transcodeBlock.OutputAvailableAsync())
            {
                if (transcodeBlock.TryReceive(out var rendition))
                {
                    renditions.Add(rendition);
                }
            }
            
            // Wait for all renditions to complete
            await transcodeBlock.Completion;
            
            // Check if any renditions failed
            if (renditions.Any(r => r.Status == RenditionStatus.Failed))
            {
                _logger.LogError("One or more renditions failed for job {JobId}", job.Id);
                await _repository.UpdateJobStatusAsync(job.Id, JobStatus.Failed, "One or more renditions failed");
                return;
            }
            
            // Generate manifest file
            var manifestPath = await GenerateManifestAsync(job, renditions);
            
            if (string.IsNullOrEmpty(manifestPath))
            {
                _logger.LogError("Failed to generate manifest for job {JobId}", job.Id);
                await _repository.UpdateJobStatusAsync(job.Id, JobStatus.Failed, "Failed to generate manifest");
                return;
            }
            
            // Update job status to completed
            job.Status = JobStatus.Completed;
            job.CompletedAt = DateTime.UtcNow;
            await _repository.UpdateJobAsync(job);
            
            _logger.LogInformation("Job {JobId} completed successfully with {RenditionCount} renditions", 
                job.Id, renditions.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing job {JobId}", job.Id);
            await _repository.UpdateJobStatusAsync(job.Id, JobStatus.Failed, ex.Message);
        }
        finally
        {
            // Clean up the input file
            if (File.Exists(localInputPath))
            {
                File.Delete(localInputPath);
            }
        }
    }
    
    private async Task<string> DownloadInputFileAsync(string inputPath)
    {
        var localPath = Path.Combine(_options.TempDirectory, $"input_{Guid.NewGuid()}.mp4");
        _logger.LogInformation("Downloading input file from {InputPath} to {LocalPath}", inputPath, localPath);
        
        await _storageService.DownloadFileAsync(inputPath, localPath);
        return localPath;
    }
    
    private async Task<Rendition> TranscodeRenditionAsync(ITranscodingProfile profile, TranscodingJob job, string inputPath, IMediaInfo mediaInfo)
    {
        var renditionId = Guid.NewGuid();
        var outputFileName = $"{renditionId}_{profile.Name}.mp4";
        var localOutputPath = Path.Combine(_options.TempDirectory, outputFileName);
        var s3OutputPath = $"{job.OutputBasePath}/{profile.Resolution}/{outputFileName}";
        
        _logger.LogInformation("Starting transcoding rendition {Resolution} for job {JobId}", 
            profile.Resolution, job.Id);
        
        try
        {
            // Create rendition record
            var rendition = new Rendition
            {
                Id = renditionId,
                TranscodingJobId = job.Id,
                Resolution = profile.Resolution,
                Bitrate = profile.Bitrate,
                OutputPath = s3OutputPath,
                Status = RenditionStatus.Processing,
                CreatedAt = DateTime.UtcNow
            };
            
            await _repository.CreateRenditionAsync(rendition);
            
            // Build the conversion command
            var videoStream = mediaInfo.VideoStreams.First()?.SetCodec(profile.VideoCodec)
                                                         .SetSize(profile.Width, profile.Height)
                                                         .SetBitrate(profile.Bitrate);
                                                         
            var audioStream = mediaInfo.AudioStreams.First()?.SetCodec(profile.AudioCodec);
            
            var conversion = FFmpeg.Conversions.New()
                .AddStream(videoStream, audioStream)
                .SetOutput(localOutputPath)
                .SetPreset(profile.Preset);
                
            // Add any additional parameters
            foreach (var parameter in profile.AdditionalParameters)
            {
                conversion.AddParameter(parameter);
            }
            
            // Start the conversion
            var result = await conversion.Start();
            
            // Upload the rendition to S3
            if (File.Exists(localOutputPath))
            {
                var uploaded = await _storageService.UploadFileAsync(
                    localOutputPath, 
                    s3OutputPath, 
                    "video/mp4",
                    new Dictionary<string, string>
                    {
                        { "Resolution", profile.Resolution },
                        { "Bitrate", profile.Bitrate.ToString() },
                        { "Codec", profile.VideoCodec },
                        { "Width", profile.Width.ToString() },
                        { "Height", profile.Height.ToString() }
                    });
                
                if (uploaded)
                {
                    rendition.Status = RenditionStatus.Completed;
                    rendition.CompletedAt = DateTime.UtcNow;
                    await _repository.UpdateRenditionAsync(rendition);
                    
                    _logger.LogInformation("Successfully transcoded rendition {Resolution} for job {JobId}", 
                        profile.Resolution, job.Id);
                }
                else
                {
                    rendition.Status = RenditionStatus.Failed;
                    await _repository.UpdateRenditionAsync(rendition);
                    
                    _logger.LogError("Failed to upload rendition {Resolution} for job {JobId}", 
                        profile.Resolution, job.Id);
                }
                
                // Clean up local file
                File.Delete(localOutputPath);
            }
            else
            {
                rendition.Status = RenditionStatus.Failed;
                await _repository.UpdateRenditionAsync(rendition);
                
                _logger.LogError("Failed to transcode rendition {Resolution} for job {JobId}, output file not found", 
                    profile.Resolution, job.Id);
            }
            
            return rendition;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error transcoding rendition {Resolution} for job {JobId}", 
                profile.Resolution, job.Id);
                
            // Update rendition status to failed
            var failedRendition = new Rendition
            {
                Id = renditionId,
                TranscodingJobId = job.Id,
                Resolution = profile.Resolution,
                Bitrate = profile.Bitrate,
                OutputPath = s3OutputPath,
                Status = RenditionStatus.Failed,
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };
            
            await _repository.CreateRenditionAsync(failedRendition);
            
            // Clean up local file if it exists
            if (File.Exists(localOutputPath))
            {
                File.Delete(localOutputPath);
            }
            
            return failedRendition;
        }
    }
    
    private async Task<string> GenerateManifestAsync(TranscodingJob job, List<Rendition> renditions)
    {
        try
        {
            var manifestFileName = $"manifest_{job.Id}.m3u8";
            var localManifestPath = Path.Combine(_options.TempDirectory, manifestFileName);
            var manifestS3Path = FormatManifestPath(job.VideoId.ToString(), job.TenantId);
            
            _logger.LogInformation("Generating HLS manifest for job {JobId} with {RenditionCount} renditions", 
                job.Id, renditions.Count);
            
            // Generate a basic HLS manifest
            using (var sw = new StreamWriter(localManifestPath))
            {
                sw.WriteLine("#EXTM3U");
                sw.WriteLine("#EXT-X-VERSION:3");
                
                foreach (var rendition in renditions.OrderBy(r => r.Bitrate))
                {
                    sw.WriteLine($"#EXT-X-STREAM-INF:BANDWIDTH={rendition.Bitrate},RESOLUTION={rendition.Resolution}");
                    sw.WriteLine(rendition.OutputPath);
                }
            }
            
            // Upload manifest to S3
            var uploaded = await _storageService.UploadFileAsync(
                localManifestPath, 
                manifestS3Path, 
                "application/vnd.apple.mpegurl",
                new Dictionary<string, string>
                {
                    { "VideoId", job.VideoId.ToString() },
                    { "RenditionCount", renditions.Count.ToString() }
                });
                
            if (!uploaded)
            {
                _logger.LogError("Failed to upload manifest for job {JobId}", job.Id);
                return null;
            }
            
            // Clean up local manifest file
            File.Delete(localManifestPath);
            
            _logger.LogInformation("Successfully generated and uploaded manifest for job {JobId} at {ManifestPath}", 
                job.Id, manifestS3Path);
                
            return manifestS3Path;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating manifest for job {JobId}", job.Id);
            return null;
        }
    }
    
    public async Task<VideoTranscodedEvent> GenerateTranscodedEventAsync(Guid jobId)
    {
        var job = await _repository.GetJobByIdAsync(jobId);
        
        if (job == null)
        {
            throw new ArgumentException($"Job with ID {jobId} not found");
        }
        
        if (job.Status != JobStatus.Completed)
        {
            throw new InvalidOperationException($"Cannot generate event for job {jobId} with status {job.Status}");
        }
        
        var renditions = await _repository.GetRenditionsForJobAsync(jobId);
        var manifestPath = FormatManifestPath(job.VideoId.ToString(), job.TenantId);
        
        var renditionInfos = renditions
            .Where(r => r.Status == RenditionStatus.Completed)
            .Select(r => 
            {
                // Parse resolution to get width and height
                var resolution = r.Resolution;
                int width = 0, height = 0;
                
                if (resolution == "480p")
                {
                    width = 854;
                    height = 480;
                }
                else if (resolution == "720p")
                {
                    width = 1280;
                    height = 720;
                }
                else if (resolution == "1080p")
                {
                    width = 1920;
                    height = 1080;
                }
                else if (resolution == "4K")
                {
                    width = 3840;
                    height = 2160;
                }
                
                return new RenditionInfo
                {
                    Resolution = r.Resolution,
                    Width = width,
                    Height = height,
                    Bitrate = r.Bitrate,
                    Codec = "h264", // Default since we're using libx264
                    Path = r.OutputPath
                };
            })
            .ToList();
            
        return new VideoTranscodedEvent
        {
            VideoId = job.VideoId,
            ManifestPath = manifestPath,
            CompletedAt = job.CompletedAt ?? DateTime.UtcNow,
            TenantId = job.TenantId,
            Renditions = renditionInfos,
            TechnicalMetadata = new Dictionary<string, string>
            {
                { "JobId", job.Id.ToString() },
                { "RenditionCount", renditionInfos.Count.ToString() },
                { "HighestResolution", renditionInfos.OrderByDescending(r => r.Height).FirstOrDefault()?.Resolution ?? "unknown" }
            },
            QualityMetrics = new Dictionary<string, string>
            {
                { "ProcessingTimeMs", ((job.CompletedAt ?? DateTime.UtcNow) - (job.StartedAt ?? job.CreatedAt)).TotalMilliseconds.ToString() }
            }
        };
    }
    
    public async Task<bool> IsJobBeingProcessedAsync(Guid videoId)
    {
        string lockKey = $"video:{videoId}";
        return await _lockService.LockExistsAsync(lockKey);
    }
    
    public async Task<bool> AbortJobAsync(Guid jobId)
    {
        var job = await _repository.GetJobByIdAsync(jobId);
        
        if (job == null)
        {
            return false;
        }
        
        // Only abort jobs that are pending or processing
        if (job.Status != JobStatus.Pending && job.Status != JobStatus.Processing)
        {
            return false;
        }
        
        // Release the lock to allow others to process this video
        string lockKey = $"video:{job.VideoId}";
        await _lockService.ReleaseLockAsync(lockKey);
        
        // Update job status to failed
        return await _repository.UpdateJobStatusAsync(jobId, JobStatus.Failed, "Job aborted by user");
    }
    
    private string FormatOutputPath(string videoId, string tenantId)
    {
        return _options.OutputPathFormat
            .Replace("{tenantId}", string.IsNullOrEmpty(tenantId) ? "default" : tenantId)
            .Replace("{videoId}", videoId);
    }
    
    private string FormatManifestPath(string videoId, string tenantId)
    {
        return _options.ManifestFormat
            .Replace("{tenantId}", string.IsNullOrEmpty(tenantId) ? "default" : tenantId)
            .Replace("{videoId}", videoId);
    }
}