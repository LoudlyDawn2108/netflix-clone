using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xabe.FFmpeg;
using Xabe.FFmpeg.Downloader;

namespace Streamflix.Transcoding.Infrastructure.Services;

public class FFmpegOptions
{
    public string FFmpegPath { get; set; } = string.Empty;
    public bool AutoDownload { get; set; } = true;
    public string FFmpegDownloadFolder { get; set; } = Path.Combine(Path.GetTempPath(), "streamflix-ffmpeg");
    public int ProgressUpdateIntervalMs { get; set; } = 5000; // Update progress every 5 seconds
}

public class FFmpegService
{
    private readonly ILogger<FFmpegService> _logger;
    private readonly FFmpegOptions _options;
    private readonly SemaphoreSlim _initSemaphore = new(1, 1);
    private bool _initialized = false;
    private readonly ConcurrentDictionary<Guid, double> _jobProgressMap = new();
    
    public FFmpegService(IOptions<FFmpegOptions> options, ILogger<FFmpegService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    }

    /// <summary>
    /// Initializes FFmpeg by setting the path or downloading it if needed
    /// </summary>
    public async Task InitializeAsync()
    {
        // Use a semaphore to prevent multiple threads from initializing FFmpeg at the same time
        await _initSemaphore.WaitAsync();
        
        try
        {
            if (_initialized)
            {
                return;
            }
            
            _logger.LogInformation("Initializing FFmpeg");
            
            // If a path is specified, use it
            if (!string.IsNullOrEmpty(_options.FFmpegPath))
            {
                if (Directory.Exists(_options.FFmpegPath))
                {
                    FFmpeg.SetExecutablesPath(_options.FFmpegPath);
                    _logger.LogInformation("FFmpeg path set to {Path}", _options.FFmpegPath);
                }
                else
                {
                    _logger.LogWarning("Specified FFmpeg path {Path} does not exist", _options.FFmpegPath);
                    if (_options.AutoDownload)
                    {
                        await DownloadFFmpegAsync();
                    }
                    else
                    {
                        throw new DirectoryNotFoundException($"FFmpeg directory not found at {_options.FFmpegPath}");
                    }
                }
            }
            else if (_options.AutoDownload)
            {
                await DownloadFFmpegAsync();
            }
            else
            {
                // Try to use system FFmpeg
                _logger.LogInformation("No FFmpeg path specified and auto-download disabled. Attempting to use system FFmpeg");
            }
            
            _initialized = true;
        }
        finally
        {
            _initSemaphore.Release();
        }
    }

    private async Task DownloadFFmpegAsync()
    {
        try
        {
            _logger.LogInformation("Downloading FFmpeg to {Path}", _options.FFmpegDownloadFolder);
            
            if (!Directory.Exists(_options.FFmpegDownloadFolder))
            {
                Directory.CreateDirectory(_options.FFmpegDownloadFolder);
            }
            
            FFmpeg.SetExecutablesPath(_options.FFmpegDownloadFolder);
            await FFmpegDownloader.GetLatestVersion(FFmpegVersion.Official, _options.FFmpegDownloadFolder);
            
            _logger.LogInformation("FFmpeg downloaded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download FFmpeg");
            throw;
        }
    }

    /// <summary>
    /// Tracks the progress of a conversion job
    /// </summary>
    public void UpdateJobProgress(Guid jobId, double progress)
    {
        _jobProgressMap[jobId] = progress;
        _logger.LogDebug("Job {JobId} progress: {Progress:P2}", jobId, progress);
    }

    /// <summary>
    /// Gets the current progress of a conversion job
    /// </summary>
    public double GetJobProgress(Guid jobId)
    {
        return _jobProgressMap.TryGetValue(jobId, out var progress) ? progress : 0;
    }
    
    /// <summary>
    /// Removes the progress tracking for a job
    /// </summary>
    public void RemoveJobProgress(Guid jobId)
    {
        _jobProgressMap.TryRemove(jobId, out _);
    }
}
