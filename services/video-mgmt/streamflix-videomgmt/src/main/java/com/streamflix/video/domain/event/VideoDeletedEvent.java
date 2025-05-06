package com.streamflix.video.domain.event;

import com.streamflix.video.domain.Video;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Domain event that represents a video deletion.
 */
public class VideoDeletedEvent {
    private final UUID eventId;
    private final UUID videoId;
    private final String title;
    private final LocalDateTime deletedAt;

    public VideoDeletedEvent(Video video) {
        this.eventId = UUID.randomUUID();
        this.videoId = video.getId();
        this.title = video.getTitle();
        this.deletedAt = LocalDateTime.now();
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

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    @Override
    public String toString() {
        return "VideoDeletedEvent{" +
                "eventId=" + eventId +
                ", videoId=" + videoId +
                ", title='" + title + '\'' +
                ", deletedAt=" + deletedAt +
                '}';
    }
}