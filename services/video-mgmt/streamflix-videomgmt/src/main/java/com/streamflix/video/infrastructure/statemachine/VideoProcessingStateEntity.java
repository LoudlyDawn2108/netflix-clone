package com.streamflix.video.infrastructure.statemachine;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity for persisting video processing state machine states.
 * This allows the state machine to be restored if the service restarts.
 */
@Entity
@Table(name = "video_processing_states")
public class VideoProcessingStateEntity {

    @Id
    @Column(name = "video_id")
    private UUID videoId;
    
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private VideoProcessingState currentState;
    
    @Column
    private LocalDateTime lastUpdated;
    
    @Column
    private String lastEvent;
    
    @Column(length = 1000)
    private String errorDetails;
    
    @Column
    private int retryCount;
    
    @Column
    private boolean compensatingTransaction;

    // Default constructor for JPA
    protected VideoProcessingStateEntity() {
    }
    
    public VideoProcessingStateEntity(UUID videoId) {
        this.videoId = videoId;
        this.currentState = VideoProcessingState.PENDING;
        this.lastUpdated = LocalDateTime.now();
        this.retryCount = 0;
        this.compensatingTransaction = false;
    }

    // Getters and setters
    public UUID getVideoId() {
        return videoId;
    }

    public VideoProcessingState getCurrentState() {
        return currentState;
    }

    public void setCurrentState(VideoProcessingState currentState) {
        this.currentState = currentState;
        this.lastUpdated = LocalDateTime.now();
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public String getLastEvent() {
        return lastEvent;
    }

    public void setLastEvent(String lastEvent) {
        this.lastEvent = lastEvent;
        this.lastUpdated = LocalDateTime.now();
    }

    public String getErrorDetails() {
        return errorDetails;
    }

    public void setErrorDetails(String errorDetails) {
        this.errorDetails = errorDetails;
    }

    public int getRetryCount() {
        return retryCount;
    }

    public void incrementRetryCount() {
        this.retryCount++;
    }

    public void resetRetryCount() {
        this.retryCount = 0;
    }

    public boolean isCompensatingTransaction() {
        return compensatingTransaction;
    }

    public void setCompensatingTransaction(boolean compensatingTransaction) {
        this.compensatingTransaction = compensatingTransaction;
    }
}
