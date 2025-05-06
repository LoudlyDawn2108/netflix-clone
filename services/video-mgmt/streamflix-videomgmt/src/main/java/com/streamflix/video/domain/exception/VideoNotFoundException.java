package com.streamflix.video.domain.exception;

import java.util.UUID;

/**
 * Exception thrown when a requested video cannot be found.
 */
public class VideoNotFoundException extends RuntimeException {

    private final UUID videoId;

    public VideoNotFoundException(UUID videoId) {
        super("Video not found with id: " + videoId);
        this.videoId = videoId;
    }

    public UUID getVideoId() {
        return videoId;
    }
}