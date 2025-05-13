using Streamflix.Transcoding.Core.Entities;
using Streamflix.Transcoding.Core.Events;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Streamflix.Transcoding.Core.Interfaces;

public interface ITranscodingService
{
    /// <summary>
    /// Processes a video for transcoding from a VideoUploaded event
    /// </summary>
    /// <param name="videoEvent">The video uploaded event</param>
    /// <returns>The created transcoding job</returns>
    Task<TranscodingJob> ProcessVideoAsync(VideoUploaded videoEvent);
    
    /// <summary>
    /// Generates a VideoTranscoded event from a completed transcoding job
    /// </summary>
    /// <param name="jobId">The job ID</param>
    /// <returns>The video transcoded event</returns>
    Task<VideoTranscoded> GenerateTranscodedEventAsync(Guid jobId);
    
    /// <summary>
    /// Checks if a job is already being processed
    /// </summary>
    /// <param name="videoId">The video ID to check</param>
    /// <returns>True if the job is being processed, false otherwise</returns>
    Task<bool> IsJobBeingProcessedAsync(Guid videoId);
    
    /// <summary>
    /// Aborts a running transcoding job
    /// </summary>
    /// <param name="jobId">The job ID to abort</param>
    /// <returns>True if the job was aborted successfully</returns>
    Task<bool> AbortJobAsync(Guid jobId);
}
