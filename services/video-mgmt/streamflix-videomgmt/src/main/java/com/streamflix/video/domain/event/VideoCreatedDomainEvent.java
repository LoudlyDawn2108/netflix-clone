package com.streamflix.video.domain.event;

import com.streamflix.video.domain.Video;

/**
 * Domain event for video creation.
 * This event is triggered when a new video entity is created.
 */
public class VideoCreatedDomainEvent {
    private final Video video;
    
    public VideoCreatedDomainEvent(Video video) {
        this.video = video;
    }
    
    public Video getVideo() {
        return video;
    }
}
