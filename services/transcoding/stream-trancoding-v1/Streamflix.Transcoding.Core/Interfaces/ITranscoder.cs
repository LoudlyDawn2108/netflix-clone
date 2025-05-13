using Streamflix.Transcoding.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Streamflix.Transcoding.Core.Interfaces
{
    public interface ITranscoder
    {
        /// <summary>
        /// Transcodes a video file into multiple renditions based on provided profiles
        /// </summary>
        /// <param name="jobId">The transcoding job ID</param>
        /// <param name="inputPath">Path to the input video file</param>
        /// <param name="outputDirectory">Directory to store output files</param>
        /// <param name="profiles">The transcoding profiles to use</param>
        /// <param name="segmentDurationSeconds">Duration of each HLS segment in seconds</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>A dictionary mapping each profile to its output path</returns>
        Task<Dictionary<ITranscodingProfile, string>> TranscodeVideoAsync(
            Guid jobId,
            string inputPath,
            string outputDirectory,
            IEnumerable<ITranscodingProfile> profiles,
            int segmentDurationSeconds = 6,
            CancellationToken cancellationToken = default);        /// <summary>
                                                                   /// Creates a master HLS manifest from individual rendition manifests
                                                                   /// </summary>
                                                                   /// <param name="renditionManifests">Dictionary of rendition profiles and their manifest paths</param>
                                                                   /// <param name="outputPath">Path where the master manifest will be written</param>
                                                                   /// <returns>Path to the created master manifest</returns>
        Task<string> CreateHlsManifestAsync(
            Dictionary<ITranscodingProfile, string> renditionManifests,
            string outputPath);

        /// <summary>
        /// Creates a DASH manifest from individual rendition manifests
        /// </summary>
        /// <param name="renditionManifests">Dictionary of rendition profiles and their manifest paths</param>
        /// <param name="outputPath">Path where the manifest will be written</param>
        /// <returns>Path to the created DASH manifest</returns>
        Task<string> CreateDashManifestAsync(
            Dictionary<ITranscodingProfile, string> renditionManifests,
            string outputPath);
    }
}
