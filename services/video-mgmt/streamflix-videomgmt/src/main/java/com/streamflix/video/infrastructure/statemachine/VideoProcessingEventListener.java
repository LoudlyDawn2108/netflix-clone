package com.streamflix.video.infrastructure.statemachine;

import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.domain.event.VideoCreatedDomainEvent;
import com.streamflix.video.domain.event.VideoStatusChangedDomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Listener for domain events to update video processing state machine.
 * This component bridges domain events with state machine operations.
 */
@Component
public class VideoProcessingEventListener {

    private static final Logger logger = LoggerFactory.getLogger(VideoProcessingEventListener.class);
    private final VideoProcessingAdapter processingAdapter;
    
    public VideoProcessingEventListener(VideoProcessingAdapter processingAdapter) {
        this.processingAdapter = processingAdapter;
    }
    
    /**
     * Handle video created event
     * @param event The video creation event
     */
    @EventListener
    public void handleVideoCreated(VideoCreatedDomainEvent event) {
        logger.info("Processing VideoCreatedDomainEvent for video: {}", event.getVideo().getId());
        processingAdapter.handleVideoCreated(event.getVideo());
    }
    
    /**
     * Handle video status changed event
     * @param event The status change event
     */
    @EventListener
    public void handleVideoStatusChanged(VideoStatusChangedDomainEvent event) {
        logger.info("Processing VideoStatusChangedDomainEvent for video {}: new status {}",
                event.getVideo().getId(), event.getNewStatus());
        
        // Map domain status changes to state machine events
        if (event.getNewStatus() == VideoStatus.UPLOADED) {
            processingAdapter.handleVideoUploadCompleted(event.getVideo().getId());
        }
        else if (event.getNewStatus() == VideoStatus.PROCESSING) {
            // If transitioning to PROCESSING, decide which processing step to start based on state machine state
            VideoProcessingState currentState = processingAdapter.getProcessingState(event.getVideo().getId());
            
            switch (currentState) {
                case UPLOADED -> processingAdapter.startValidation(event.getVideo().getId());
                case VALIDATING -> processingAdapter.startTranscoding(event.getVideo().getId());
                case TRANSCODING -> processingAdapter.startMetadataExtraction(event.getVideo().getId());
                case EXTRACTING_METADATA -> processingAdapter.startThumbnailGeneration(event.getVideo().getId());
                default -> logger.warn("Unexpected state transition to PROCESSING from state: {}", currentState);
            }
        }
        else if (event.getNewStatus() == VideoStatus.READY) {
            // Ensure we've gone through all steps
            VideoProcessingState currentState = processingAdapter.getProcessingState(event.getVideo().getId());
            
            if (currentState == VideoProcessingState.GENERATING_THUMBNAILS) {
                processingAdapter.handleThumbnailGenerationSucceeded(event.getVideo().getId());
            }
        }
        else if (event.getNewStatus() == VideoStatus.FAILED) {
            processingAdapter.markAsFailed(event.getVideo().getId(), "Video processing failed");
        }
        else if (event.getNewStatus() == VideoStatus.DELETED) {
            processingAdapter.deleteVideo(event.getVideo().getId());
        }
    }
}
