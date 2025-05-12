package com.streamflix.video.infrastructure.statemachine;

/**
 * States for the video processing state machine.
 * This enum represents all possible states a video can be in during the processing workflow.
 */
public enum VideoProcessingState {
    PENDING,    // Initial state when metadata is created but no file is uploaded yet
    UPLOADED,   // Raw video file has been uploaded to storage
    VALIDATING, // Validating the video file format, integrity, etc.
    TRANSCODING, // Video is being transcoded into different formats/qualities
    EXTRACTING_METADATA, // Extracting metadata from the video file
    GENERATING_THUMBNAILS, // Generating thumbnail images
    READY,      // Video is fully processed and ready for streaming
    FAILED,     // Processing has failed
    DELETED     // Video has been marked as deleted
}
