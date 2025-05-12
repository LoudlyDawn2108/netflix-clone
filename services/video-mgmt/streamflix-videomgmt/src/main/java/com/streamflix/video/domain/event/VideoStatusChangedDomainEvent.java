package com.streamflix.video.domain.event;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;

/**
 * Domain event for video status changes.
 * This event is triggered when a video's status is changed.
 */
public class VideoStatusChangedDomainEvent {
    private final Video video;
    private final VideoStatus newStatus;
    
    public VideoStatusChangedDomainEvent(Video video, VideoStatus newStatus) {
        this.video = video;
        this.newStatus = newStatus;
    }
    
    public Video getVideo() {
        return video;
    }
    
    public VideoStatus getNewStatus() {
        return newStatus;
    }
}
