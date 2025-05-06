package com.streamflix.video.infrastructure.messaging;

import org.springframework.stereotype.Component;

/**
 * Constants for video event channels.
 * These constants define the binding names used in Spring Cloud Stream configuration.
 */
@Component
public class VideoEventChannels {

    public static final String VIDEO_CREATED_OUTPUT = "video-created-out";
    public static final String VIDEO_UPDATED_OUTPUT = "video-updated-out";
    public static final String VIDEO_DELETED_OUTPUT = "video-deleted-out";
    public static final String VIDEO_STATUS_CHANGED_OUTPUT = "video-status-changed-out";
    public static final String VIDEO_PROCESSING_REQUESTED_OUTPUT = "video-processing-requested-out";
}