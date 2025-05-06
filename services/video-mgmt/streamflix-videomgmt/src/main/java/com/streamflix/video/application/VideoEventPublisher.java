package com.streamflix.video.application;

import com.streamflix.video.domain.Video;

/**
 * Interface for publishing video-related domain events.
 * This is a port in the hexagonal architecture that will be implemented
 * by adapters in the infrastructure layer.
 */
public interface VideoEventPublisher {

    /**
     * Publish an event when a new video is created
     * @param video The newly created video
     */
    void publishVideoCreated(Video video);

    /**
     * Publish an event when a video's metadata is updated
     * @param video The updated video
     */
    void publishVideoUpdated(Video video);
    
    /**
     * Publish an event when a video's status changes
     * @param video The video with updated status
     */
    void publishVideoStatusChanged(Video video);
    
    /**
     * Publish an event when a video is deleted
     * @param video The deleted video
     */
    void publishVideoDeleted(Video video);
    
    /**
     * Publish an event when a video's processing should be triggered
     * @param video The video to process
     */
    void publishVideoProcessingRequested(Video video);
}