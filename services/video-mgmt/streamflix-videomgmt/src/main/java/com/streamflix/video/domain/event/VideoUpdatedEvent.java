package com.streamflix.video.domain.event;

import com.streamflix.video.domain.Video;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Domain event that represents a video update.
 */
public class VideoUpdatedEvent {
    private final UUID eventId;
    private final UUID videoId;
    private final String title;
    private final LocalDateTime updatedAt;

    public VideoUpdatedEvent(Video video) {
        this.eventId = UUID.randomUUID();
        this.videoId = video.getId();
        this.title = video.getTitle();
        this.updatedAt = LocalDateTime.now();
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

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public String toString() {
        return "VideoUpdatedEvent{" +
                "eventId=" + eventId +
                ", videoId=" + videoId +
                ", title='" + title + '\'' +
                ", updatedAt=" + updatedAt +
                '}';
    }
}