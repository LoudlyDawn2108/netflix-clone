package com.streamflix.video.infrastructure.statemachine;

/**
 * Events for the video processing state machine.
 * These events trigger transitions between states in the video processing workflow.
 */
public enum VideoProcessingEvent {
    UPLOAD_COMPLETED,        // Video file has been uploaded successfully
    START_VALIDATION,        // Begin validation of the uploaded video
    VALIDATION_SUCCEEDED,    // Video validation passed
    VALIDATION_FAILED,       // Video validation failed
    START_TRANSCODING,       // Begin video transcoding process
    TRANSCODING_SUCCEEDED,   // Video transcoding completed successfully
    TRANSCODING_FAILED,      // Video transcoding failed
    START_METADATA_EXTRACTION, // Begin extracting metadata from video
    METADATA_EXTRACTION_SUCCEEDED, // Metadata extraction completed successfully
    METADATA_EXTRACTION_FAILED,    // Metadata extraction failed
    START_THUMBNAIL_GENERATION,    // Begin generating thumbnails
    THUMBNAIL_GENERATION_SUCCEEDED, // Thumbnail generation completed successfully
    THUMBNAIL_GENERATION_FAILED,    // Thumbnail generation failed
    PROCESSING_COMPLETED,   // All processing steps completed successfully
    MARK_AS_FAILED,         // Mark the video as failed due to any processing error
    DELETE                  // Delete the video
}
