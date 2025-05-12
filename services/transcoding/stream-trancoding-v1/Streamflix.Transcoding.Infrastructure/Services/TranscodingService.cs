using System.Threading.Tasks.Dataflow;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Events;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;

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
    public int HlsSegmentDuration { get; set; } = 6; // Duration of each HLS segment in seconds
    public bool GenerateDashManifest { get; set; } = true; // Whether to also generate DASH manifests
    public ITranscodingProfile[] DefaultProfiles { get; set; } = Core.Interfaces.PredefinedProfiles.DefaultProfiles;
}

public class TranscodingService : ITranscodingService
{
    private readonly ITranscodingRepository _repository;
    private readonly IS3StorageService _storageService;
    private readonly IDistributedLockService _lockService;
    private readonly ILogger<TranscodingService> _logger;
    private readonly TranscodingServiceOptions _options;
    private readonly FFmpegTranscoder _ffmpegTranscoder;
    private readonly SemaphoreSlim _jobSemaphore;
    
    private static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(5);
    
    public TranscodingService(
        ITranscodingRepository repository,
        IS3StorageService storageService,
        IDistributedLockService lockService,
        FFmpegTranscoder ffmpegTranscoder,
        IOptions<TranscodingServiceOptions> options,
        ILogger<TranscodingService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _storageService = storageService ?? throw new ArgumentNullException(nameof(storageService));
        _lockService = lockService ?? throw new ArgumentNullException(nameof(lockService));
        _ffmpegTranscoder = ffmpegTranscoder ?? throw new ArgumentNullException(nameof(ffmpegTranscoder));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _jobSemaphore = new SemaphoreSlim(_options.MaxConcurrentJobs, _options.MaxConcurrentJobs);
        
        Directory.CreateDirectory(_options.TempDirectory);
    }
      public async Task<TranscodingJob> ProcessVideoAsync(VideoUploaded videoEvent)
    {
        if (videoEvent == null) throw new ArgumentNullException(nameof(videoEvent));
        
        string lockKey = $"video:{videoEvent.VideoId}";
        string tempWorkingDir = string.Empty;
        
        try
        {
            // Try to acquire a lock for this video ID
            bool lockAcquired = await _lockService.AcquireLockAsync(lockKey, LockDuration);
            
            if (!lockAcquired)
            {
                _logger.LogWarning("Could not acquire lock for video ID: {VideoId}. It might be already processing", 
                    videoEvent.VideoId);
                
                // Check if job exists and return it
                var existingJob = await _repository.GetJobByVideoIdAsync(videoEvent.VideoId, videoEvent.TenantId);
                if (existingJob != null)
                {
                    _logger.LogInformation("Found existing job for video ID: {VideoId}, status: {Status}", 
                        videoEvent.VideoId, existingJob.Status);
                    return existingJob;
                }
                
                throw new InvalidOperationException($"Could not acquire lock for video ID: {videoEvent.VideoId} and no existing job found");
            }
            
            // Check if there's already a job for this video
            var job = await _repository.GetJobByVideoIdAsync(videoEvent.VideoId, videoEvent.TenantId);
            
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
                InputFileS3Path = videoEvent.FilePath,
                Status = TranscodingJobStatus.Received,
                CreatedAt = DateTime.UtcNow,
                TenantId = videoEvent.TenantId
            };
            
            // Save the job
            job = await _repository.CreateJobAsync(job);
            _logger.LogInformation("Created new transcoding job with ID: {JobId} for video ID: {VideoId}", 
                job.Id, job.VideoId);

            // Acquire semaphore for job concurrency control
            await _jobSemaphore.WaitAsync();
            
            try
            {
                // Update job status to processing
                await _repository.UpdateJobStatusAsync(job.Id, TranscodingJobStatus.Processing);

                // Create a unique temporary working directory for this job
                tempWorkingDir = Path.Combine(_options.TempDirectory, job.Id.ToString());
                Directory.CreateDirectory(tempWorkingDir);
                _logger.LogInformation("Created temporary working directory: {TempDir}", tempWorkingDir);

                // Download the source video file from S3
                string sourceFile = await DownloadSourceFileAsync(job, tempWorkingDir);

                // Create rendition records in the database
                var renditions = await CreateRenditionRecordsAsync(job);

                // Process the video with FFmpeg
                var outputFiles = await ProcessVideoWithFFmpegAsync(job, sourceFile, tempWorkingDir, renditions);

                // Upload the transcoded files to S3
                var outputS3Paths = await UploadTranscodedFilesAsync(job, outputFiles);

                // Create and upload the manifests
                string hlsManifestPath = await CreateAndUploadHlsManifestAsync(job, outputFiles);
                
                // Create and upload DASH manifest if enabled
                string? dashManifestPath = null;
                if (_options.GenerateDashManifest)
                {
                    dashManifestPath = await CreateAndUploadDashManifestAsync(job, outputFiles);
                }

                // Update job with manifest path
                job.OutputManifestS3Path = hlsManifestPath;
                job.Status = TranscodingJobStatus.Completed;
                job = await _repository.UpdateJobAsync(job);

                _logger.LogInformation(
                    "Completed transcoding job {JobId} for video {VideoId}. HLS manifest: {ManifestPath}, DASH manifest: {DashManifest}",
                    job.Id, job.VideoId, hlsManifestPath, dashManifestPath ?? "Not generated");

                return job;
            }
            finally
            {
                _jobSemaphore.Release();
                
                // Clean up temporary files
                try
                {
                    if (!string.IsNullOrEmpty(tempWorkingDir) && Directory.Exists(tempWorkingDir))
                    {
                        Directory.Delete(tempWorkingDir, true);
                        _logger.LogInformation("Cleaned up temporary directory: {TempDir}", tempWorkingDir);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to clean up temporary directory: {TempDir}", tempWorkingDir);
                }
                
                // Always release the lock
                await _lockService.ReleaseLockAsync(lockKey);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing transcoding job for video ID: {VideoId}", videoEvent.VideoId);
            await _lockService.ReleaseLockAsync(lockKey);
            throw;
        }
    }
    
    private async Task<string> DownloadSourceFileAsync(TranscodingJob job, string tempWorkingDir)
    {
        try
        {
            _logger.LogInformation("Downloading source file from {S3Path} for job {JobId}", 
                job.InputFileS3Path, job.Id);
            
            // Determine destination path in the temp directory
            string sourceFileName = Path.GetFileName(job.InputFileS3Path);
            string localSourcePath = Path.Combine(tempWorkingDir, sourceFileName);
            
            // Download the file from S3
            await _storageService.DownloadFileAsync(job.InputFileS3Path, localSourcePath);
            
            _logger.LogInformation("Source file downloaded to {LocalPath} for job {JobId}", 
                localSourcePath, job.Id);
                
            return localSourcePath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download source file for job {JobId}", job.Id);
            await _repository.UpdateJobStatusAsync(job.Id, TranscodingJobStatus.Failed, $"Failed to download source file: {ex.Message}");
            throw;
        }
    }
    
    private async Task<List<Rendition>> CreateRenditionRecordsAsync(TranscodingJob job)
    {
        var renditions = new List<Rendition>();
        
        foreach (var profile in _options.DefaultProfiles)
        {
            var rendition = new Rendition
            {
                Id = Guid.NewGuid(),
                TranscodingJobId = job.Id,
                Resolution = profile.Resolution,
                Bitrate = profile.Bitrate,
                Status = RenditionStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            
            renditions.Add(rendition);
        }
        
        // Save all renditions to the database
        await _repository.AddRenditionsAsync(renditions);
        
        _logger.LogInformation("Created {Count} rendition records for job {JobId}", 
            renditions.Count, job.Id);
            
        return renditions;
    }
    
    private async Task<Dictionary<ITranscodingProfile, string>> ProcessVideoWithFFmpegAsync(
        TranscodingJob job, 
        string sourceFilePath,
        string tempWorkingDir,
        List<Rendition> renditions)
    {
        try
        {
            _logger.LogInformation("Starting FFmpeg processing for job {JobId} with {Count} profiles", 
                job.Id, _options.DefaultProfiles.Length);
            
            // Create a subdirectory for the transcoded files
            string transcodedDir = Path.Combine(tempWorkingDir, "transcoded");
            Directory.CreateDirectory(transcodedDir);
            
            // Update rendition statuses to Processing
            foreach (var rendition in renditions)
            {
                rendition.Status = RenditionStatus.Processing;
                await _repository.UpdateRenditionAsync(rendition);
            }
            
            // Start the transcoding process
            var outputFiles = await _ffmpegTranscoder.TranscodeVideoAsync(
                job.Id,
                sourceFilePath,
                transcodedDir,
                _options.DefaultProfiles,
                _options.HlsSegmentDuration);
                
            // Update rendition records with output paths and status
            foreach (var (profile, outputPath) in outputFiles)
            {
                var rendition = renditions.FirstOrDefault(r => r.Resolution == profile.Resolution);
                if (rendition != null)
                {
                    rendition.OutputPath = outputPath;
                    rendition.Status = RenditionStatus.Completed;
                    rendition.CompletedAt = DateTime.UtcNow;
                    await _repository.UpdateRenditionAsync(rendition);
                }
            }
            
            _logger.LogInformation("Completed FFmpeg processing for job {JobId}", job.Id);
            
            return outputFiles;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed FFmpeg processing for job {JobId}", job.Id);
            
            // Update rendition statuses to Failed
            foreach (var rendition in renditions)
            {
                if (rendition.Status == RenditionStatus.Processing)
                {
                    rendition.Status = RenditionStatus.Failed;
                    await _repository.UpdateRenditionAsync(rendition);
                }
            }
            
            await _repository.UpdateJobStatusAsync(job.Id, TranscodingJobStatus.Failed, $"FFmpeg processing failed: {ex.Message}");
            throw;
        }
    }
    
    private async Task<Dictionary<ITranscodingProfile, string>> UploadTranscodedFilesAsync(
        TranscodingJob job,
        Dictionary<ITranscodingProfile, string> localFiles)
    {
        var s3Paths = new Dictionary<ITranscodingProfile, string>();
        
        foreach (var (profile, localFilePath) in localFiles)
        {
            try
            {
                var outputDir = Path.GetDirectoryName(localFilePath);
                if (string.IsNullOrEmpty(outputDir))
                {
                    _logger.LogWarning("Could not determine directory for path {Path}", localFilePath);
                    continue;
                }
                
                // Get all files in the directory (segments and playlist)
                var allFiles = Directory.GetFiles(outputDir, "*.*");
                
                foreach (var file in allFiles)
                {
                    // Determine the S3 key
                    string s3Key = GetS3KeyForRendition(job, profile, file);
                    
                    // Determine content type
                    string contentType = Path.GetExtension(file).ToLowerInvariant() switch
                    {
                        ".m3u8" => "application/vnd.apple.mpegurl",
                        ".ts" => "video/mp2t",
                        ".mp4" => "video/mp4",
                        ".m4s" => "video/iso.segment",
                        ".mpd" => "application/dash+xml",
                        _ => "application/octet-stream"
                    };
                    
                    // Upload the file
                    await _storageService.UploadFileAsync(file, s3Key, contentType);
                    
                    // If this is the playlist file, add it to the result
                    if (file.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase))
                    {
                        s3Paths[profile] = s3Key;
                    }
                }
                
                _logger.LogInformation("Uploaded rendition {Resolution} for job {JobId}", 
                    profile.Resolution, job.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload rendition {Resolution} for job {JobId}", 
                    profile.Resolution, job.Id);
                throw;
            }
        }
        
        return s3Paths;
    }
    
    private async Task<string> CreateAndUploadHlsManifestAsync(
        TranscodingJob job,
        Dictionary<ITranscodingProfile, string> localFiles)
    {
        try
        {
            // Get the directory of the first file to use as the output directory
            string outputDir = Path.GetDirectoryName(localFiles.First().Value) ?? 
                throw new InvalidOperationException("Could not determine output directory for manifest");
                
            // Create the HLS manifest
            string manifestPath = await _ffmpegTranscoder.CreateHlsManifestAsync(localFiles, Path.GetDirectoryName(outputDir));
            
            // Upload the manifest to S3
            string s3Key = FormatManifestPath(job.VideoId.ToString(), job.TenantId);
            await _storageService.UploadFileAsync(manifestPath, s3Key, "application/vnd.apple.mpegurl");
            
            _logger.LogInformation("Created and uploaded HLS manifest for job {JobId}: {ManifestPath}", 
                job.Id, s3Key);
                
            return s3Key;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create and upload HLS manifest for job {JobId}", job.Id);
            throw;
        }
    }
    
    private async Task<string> CreateAndUploadDashManifestAsync(
        TranscodingJob job,
        Dictionary<ITranscodingProfile, string> localFiles)
    {
        try
        {
            // Get the directory of the first file to use as the output directory
            string outputDir = Path.GetDirectoryName(localFiles.First().Value) ?? 
                throw new InvalidOperationException("Could not determine output directory for manifest");
                
            // Create the DASH manifest
            string manifestPath = await _ffmpegTranscoder.CreateDashManifestAsync(localFiles, Path.GetDirectoryName(outputDir));
            
            // Upload the manifest to S3
            string s3Key = FormatManifestPath(job.VideoId.ToString(), job.TenantId)
                .Replace(".m3u8", ".mpd");
                
            await _storageService.UploadFileAsync(manifestPath, s3Key, "application/dash+xml");
            
            _logger.LogInformation("Created and uploaded DASH manifest for job {JobId}: {ManifestPath}", 
                job.Id, s3Key);
                
            return s3Key;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create and upload DASH manifest for job {JobId}", job.Id);
            throw;
        }
    }
    
    private string GetS3KeyForRendition(TranscodingJob job, ITranscodingProfile profile, string localFilePath)
    {
        string basePath = FormatOutputPath(job.VideoId.ToString(), job.TenantId);
        string fileName = Path.GetFileName(localFilePath);
        string fileDir = Path.GetFileName(Path.GetDirectoryName(localFilePath));
        
        // If this is in a resolution-specific directory, include that in the path
        if (fileDir == profile.Resolution)
        {
            return $"{basePath}/{profile.Resolution}/{fileName}";
        }
        
        return $"{basePath}/{fileName}";
    }
    
    public async Task<VideoTranscoded> GenerateTranscodedEventAsync(Guid jobId)
    {
        var job = await _repository.GetJobByIdAsync(jobId);
        
        if (job == null)
        {
            throw new ArgumentException($"Job with ID {jobId} not found");
        }
        
        if (job.Status != TranscodingJobStatus.Completed)
        {
            throw new InvalidOperationException($"Cannot generate event for job {jobId} with status {job.Status}");
        }
        
        var renditions = await _repository.GetRenditionsForJobAsync(jobId);
        var manifestPath = FormatManifestPath(job.VideoId.ToString(), job.TenantId);
        
        var outputDetails = new Dictionary<string, string>();
        
        // Add rendition details to the dictionary
        foreach (var rendition in renditions.Where(r => r.Status == RenditionStatus.Completed))
        {
            outputDetails.Add($"resolution_{rendition.Resolution}", rendition.OutputPath);
        }
        
        return new VideoTranscoded
        {
            JobId = job.Id,
            VideoId = job.VideoId,
            TenantId = job.TenantId,
            Success = true,
            ManifestUrl = manifestPath,
            TranscodingStartedAt = job.CreatedAt,
            TranscodingCompletedAt = DateTimeOffset.UtcNow,
            OutputDetails = outputDetails
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
        if (job.Status != TranscodingJobStatus.Received && job.Status != TranscodingJobStatus.Processing)
        {
            return false;
        }
        
        // Release the lock to allow others to process this video
        string lockKey = $"video:{job.VideoId}";
        await _lockService.ReleaseLockAsync(lockKey);
        
        // Update job status to failed
        return await _repository.UpdateJobStatusAsync(jobId, TranscodingJobStatus.Failed, "Job aborted by user");
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