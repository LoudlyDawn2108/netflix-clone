using Microsoft.Extensions.Logging;
using Streamflix.Transcoding.Core.Interfaces;
using Streamflix.Transcoding.Core.Models;
using System.Text;
using Xabe.FFmpeg;

namespace Streamflix.Transcoding.Infrastructure.Services;

public class FFmpegTranscoder : ITranscoder
{
    private readonly FFmpegService _ffmpegService;
    private readonly ILogger<FFmpegTranscoder> _logger;

    public FFmpegTranscoder(FFmpegService ffmpegService, ILogger<FFmpegTranscoder> logger)
    {
        _ffmpegService = ffmpegService ?? throw new ArgumentNullException(nameof(ffmpegService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Transcodes a video file into multiple renditions based on provided profiles
    /// </summary>
    /// <param name="jobId">The transcoding job ID</param>
    /// <param name="inputPath">Path to the input video file</param>
    /// <param name="outputDirectory">Directory to store output files</param>
    /// <param name="profiles">The transcoding profiles to use</param>
    /// <param name="segmentDurationSeconds">Duration of each HLS segment in seconds</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A dictionary mapping each profile name to its output path</returns>
    public async Task<Dictionary<ITranscodingProfile, string>> TranscodeVideoAsync(
        Guid jobId,
        string inputPath,
        string outputDirectory,
        IEnumerable<ITranscodingProfile> profiles,
        int segmentDurationSeconds = 6,
        CancellationToken cancellationToken = default)
    {
        // Ensure FFmpeg is initialized
        await _ffmpegService.InitializeAsync();

        // Ensure output directory exists
        Directory.CreateDirectory(outputDirectory);

        // Get media info for the input file
        var mediaInfo = await FFmpeg.GetMediaInfo(inputPath);

        _logger.LogInformation("Starting transcoding for job {JobId}. Input file: {InputPath}, Duration: {Duration}",
            jobId, inputPath, mediaInfo.Duration);

        var results = new Dictionary<ITranscodingProfile, string>();
        var tasks = new List<Task>();

        // We'll process each profile in its own task
        foreach (var profile in profiles)
        {
            // Create a profile-specific task
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    string outputFilePath = await TranscodeToProfileAsync(jobId, inputPath, outputDirectory, profile,
                        mediaInfo, segmentDurationSeconds, cancellationToken);

                    lock (results)
                    {
                        results[profile] = outputFilePath;
                    }

                    _logger.LogInformation("Completed transcoding to {Resolution} for job {JobId}",
                        profile.Resolution, jobId);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Failed to transcode job {JobId} to {Resolution}", jobId, profile.Resolution);
                    throw;
                }
            }, cancellationToken));
        }

        // Wait for all transcoding tasks to complete
        await Task.WhenAll(tasks);

        // Clean up progress tracking
        _ffmpegService.RemoveJobProgress(jobId);

        return results;
    }    /// <summary>
    /// Creates HLS playlist and manifest files
    /// </summary>
    /// <param name="renditionFiles">Dictionary of profiles to output paths</param>
    /// <param name="outputDirectory">Directory to store manifest files</param>
    /// <returns>Path to the master manifest file</returns>
    public async Task<string> CreateHlsManifestAsync(
        Dictionary<ITranscodingProfile, string> renditionFiles,
        string outputDirectory)
    {
        var masterManifestPath = Path.Combine(outputDirectory, "master.m3u8");

        // Create the master playlist
        var masterContent = new StringBuilder();
        masterContent.AppendLine("#EXTM3U");
        masterContent.AppendLine("#EXT-X-VERSION:3");

        // Add each rendition to the master playlist
        foreach (var kvp in renditionFiles)
        {
            var profile = kvp.Key;
            var path = kvp.Value;
            
            // Calculate the relative path from the master manifest to the rendition playlist
            string renditionFilename = Path.GetFileName(path);
            string renditionPath = $"{profile.Resolution}/{renditionFilename}";

            // Add the stream info
            masterContent.AppendLine($"#EXT-X-STREAM-INF:BANDWIDTH={profile.Bitrate},RESOLUTION={profile.Width}x{profile.Height}");
            masterContent.AppendLine(renditionPath);
        }        // Ensure directory exists
        string? directoryName = Path.GetDirectoryName(masterManifestPath);
        if (!string.IsNullOrEmpty(directoryName))
        {
            Directory.CreateDirectory(directoryName);
        }
        
        // Write the manifest file
        await File.WriteAllTextAsync(masterManifestPath, masterContent.ToString());

        return masterManifestPath;
    }    /// <summary>
    /// Creates DASH manifest
    /// </summary>
    /// <param name="renditionFiles">Dictionary of profiles to output paths</param>
    /// <param name="outputDirectory">Directory to store manifest files</param>
    /// <returns>Path to the MPD manifest file</returns>
    public async Task<string> CreateDashManifestAsync(
        Dictionary<ITranscodingProfile, string> renditionFiles,
        string outputDirectory)
    {
        // Ensure FFmpeg is initialized
        await _ffmpegService.InitializeAsync();

        string outputPath = Path.Combine(outputDirectory, "manifest.mpd");

        // Create FFmpeg conversion to generate the DASH manifest
        var conversion = FFmpeg.Conversions.New();
        
        // Add input files properly
        foreach (var filePath in renditionFiles.Values)
        {
            conversion.AddParameter($"-i \"{filePath}\"");
        }

        // Configure DASH output
        conversion
            .AddParameter("-c copy")
            .AddParameter("-f dash")
            .AddParameter("-use_template 1")
            .AddParameter("-use_timeline 1")
            .AddParameter("-seg_duration 6")
            .AddParameter("-init_seg_name \"init_$RepresentationID$.m4s\"")
            .AddParameter("-media_seg_name \"chunk_$RepresentationID$_$Number%05d$.m4s\"")
            .SetOutput(outputPath);

        // Start the conversion
        _logger.LogInformation("Creating DASH manifest at {OutputPath}", outputPath);
        await conversion.Start();

        return outputPath;
    }

    private async Task<string> TranscodeToProfileAsync(
        Guid jobId,
        string inputPath,
        string outputDirectory,
        ITranscodingProfile profile,
        IMediaInfo mediaInfo,
        int segmentDurationSeconds,
        CancellationToken cancellationToken)
    {
        string profileOutputDir = Path.Combine(outputDirectory, profile.Resolution);
        Directory.CreateDirectory(profileOutputDir);

        // Create output file path for HLS playlist
        string outputPath = Path.Combine(profileOutputDir, $"{profile.Resolution}.m3u8");

        _logger.LogInformation("Starting transcoding to {Resolution} for job {JobId}. Output: {OutputPath}",
            profile.Resolution, jobId, outputPath);        // Prepare the conversion
        var conversion = FFmpeg.Conversions.New()
            .AddStream(mediaInfo.VideoStreams.First())
            .AddStream(mediaInfo.AudioStreams.First())
            .SetOutput(outputPath)
            .AddParameter($"-c:v {profile.VideoCodec}")
            .AddParameter($"-c:a {profile.AudioCodec}")
            .AddParameter($"-pix_fmt yuv420p") // Widely compatible pixel format
            .AddParameter($"-s {profile.Width}x{profile.Height}")
            .AddParameter($"-b:v {profile.Bitrate}")
            .SetOutputFormat("hls")            .AddParameter($"-hls_time {segmentDurationSeconds}")
            .AddParameter("-hls_list_size 0") // Keep all segments in the playlist
            .AddParameter($"-hls_segment_filename \"{profileOutputDir}/%03d.ts\"")
            .AddParameter("-hls_playlist_type vod")
            .AddParameter("-hls_flags independent_segments")
            .AddParameter("-master_pl_name")  // Don't create a master playlist per profile
            .AddParameter("-threads 0"); // Use optimal number of threads

        // Add any additional parameters from the profile
        foreach (var param in profile.AdditionalParameters)
        {
            conversion.AddParameter(param);
        }

        // Add progress handler
        conversion.OnProgress += (sender, args) =>
        {
            // Update progress in the FFmpegService
            _ffmpegService.UpdateJobProgress(jobId, args.Percent / 100.0);

            // Log progress at intervals to avoid log flooding
            if (args.Percent % 10 == 0 || args.Percent >= 99)
            {
                _logger.LogInformation("Job {JobId} - {Resolution} progress: {Progress}%",
                    jobId, profile.Resolution, args.Percent);
            }
        };

        // Start the conversion
        await conversion.Start(cancellationToken);

        return outputPath;
    }
}
