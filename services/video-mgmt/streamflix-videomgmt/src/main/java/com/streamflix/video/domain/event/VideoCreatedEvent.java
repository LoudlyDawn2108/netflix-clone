package com.streamflix.video.domain.event;

import com.streamflix.video.domain.Video;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Domain event that represents a video creation.
 */
public class VideoCreatedEvent {
    private final UUID eventId;
    private final UUID videoId;
    private final String title;
    private final LocalDateTime createdAt;

    public VideoCreatedEvent(Video video) {
        this.eventId = UUID.randomUUID();
        this.videoId = video.getId();
        this.title = video.getTitle();
        this.createdAt = LocalDateTime.now();
    }

    public UUID getEventId() {
        return eventId;
    }

    public UUID getVideoId() {
        return videoId;
    }

    public String getTitle() {
        return title;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public String toString() {
        return "VideoCreatedEvent{" +
                "eventId=" + eventId +
                ", videoId=" + videoId +
                ", title='" + title + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}