package com.streamflix.video.domain;

public enum VideoStatus {
    PENDING,    // Initial state when metadata is created
    UPLOADED,   // Raw video file has been uploaded to storage
    PROCESSING, // Video is being transcoded
    READY,      // Video is processed and ready for streaming
    FAILED,     // Processing or upload has failed
    DELETED     // Video has been marked as deleted
}