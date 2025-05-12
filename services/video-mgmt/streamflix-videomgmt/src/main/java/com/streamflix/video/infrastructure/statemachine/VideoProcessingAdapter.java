package com.streamflix.video.infrastructure.statemachine;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.domain.exception.VideoNotFoundException;
import com.streamflix.video.application.port.VideoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Adapter that connects domain model operations with the state machine.
 * This class ensures that domain model status changes are reflected in the state machine and vice versa.
 */
@Component
public class VideoProcessingAdapter {
    
    private static final Logger logger = LoggerFactory.getLogger(VideoProcessingAdapter.class);
    
    private final VideoProcessingStateMachineService stateMachineService;
    private final VideoService videoService;
    
    public VideoProcessingAdapter(VideoProcessingStateMachineService stateMachineService, VideoService videoService) {
        this.stateMachineService = stateMachineService;
        this.videoService = videoService;
    }
    
    /**
     * Handle video creation - initialize the state machine
     * @param video The newly created video
     */
    @Transactional
    public void handleVideoCreated(Video video) {
        logger.info("Handling video creation: {}", video.getId());
        stateMachineService.initializeStateMachine(video);
    }
    
    /**
     * Handle video upload completed
     * @param videoId ID of the uploaded video
     * @return true if the state transition was successful
     */
    @Transactional
    public boolean handleVideoUploadCompleted(UUID videoId) {
        logger.info("Handling video upload completed: {}", videoId);
        
        boolean success = stateMachineService.sendEvent(videoId, VideoProcessingEvent.UPLOAD_COMPLETED);
        
        if (success) {
            // Update domain model status to match state machine
            videoService.updateVideoStatus(videoId, VideoStatus.UPLOADED);
        }
        
        return success;
    }
    
    /**
     * Start validation step of video processing
     * @param videoId The ID of the video
     * @return true if state transition was successful
     */
    @Transactional
    public boolean startValidation(UUID videoId) {
        logger.info("Starting validation for video: {}", videoId);
        
        boolean success = stateMachineService.sendEvent(videoId, VideoProcessingEvent.START_VALIDATION);
        
        if (success) {
            // Update domain model to PROCESSING if not already
            videoService.getVideo(videoId).ifPresent(video -> {
                if (video.getStatus() != VideoStatus.PROCESSING) {
                    videoService.updateVideoStatus(videoId, VideoStatus.PROCESSING);
                }
            });
        }
        
        return success;
    }
    
    /**
     * Handle validation completed successfully
     * @param videoId The ID of the validated video
     * @return true if state transition was successful
     */
    @Transactional
    public boolean handleValidationSucceeded(UUID videoId) {
        logger.info("Validation succeeded for video: {}", videoId);
        return stateMachineService.sendEvent(videoId, VideoProcessingEvent.VALIDATION_SUCCEEDED);
    }
    
    /**
     * Handle validation failed
     * @param videoId The ID of the video
     * @param errorMessage Error details
     * @return true if state transition was successful
     */
    @Transactional
    public boolean handleValidationFailed(UUID videoId, String errorMessage) {
        logger.error("Validation failed for video {}: {}", videoId, errorMessage);
        
        boolean success = stateMachineService.sendEvent(videoId, VideoProcessingEvent.VALIDATION_FAILED);
        
        if (success) {
            videoService.updateVideoStatus(videoId, VideoStatus.FAILED);
        }
        
        return success;
    }
    
    /**
     * Start transcoding step
     * @param videoId The ID of the video
     * @return true if state transition was successful
     */
    @Transactional
    public boolean startTranscoding(UUID videoId) {
        logger.info("Starting transcoding for video: {}", videoId);
        return stateMachineService.sendEvent(videoId, VideoProcessingEvent.START_TRANSCODING);
    }
    
    /**
     * Handle transcoding completed successfully
     * @param videoId The ID of the transcoded video
     * @return true if state transition was successful
     */
    @Transactional
    public boolean handleTranscodingSucceeded(UUID videoId) {
        logger.info("Transcoding succeeded for video: {}", videoId);
        return stateMachineService.sendEvent(videoId, VideoProcessingEvent.TRANSCODING_SUCCEEDED);
    }
    
    /**
     * Handle transcoding failed
     * @param videoId The ID of the video
     * @param errorMessage Error details
     * @return true if state transition was successful
     */
    @Transactional
    public boolean handleTranscodingFailed(UUID videoId, String errorMessage) {
        logger.error("Transcoding failed for video {}: {}", videoId, errorMessage);
        
        boolean success = stateMachineService.sendEvent(videoId, VideoProcessingEvent.TRANSCODING_FAILED);
        
        if (success) {
            videoService.updateVideoStatus(videoId, VideoStatus.FAILED);
        }
        
        return success;
    }
    
    /**
     * Start metadata extraction step
     * @param videoId The ID of the video
     * @return true if state transition was successful
     */
    @Transactional
    public boolean startMetadataExtraction(UUID videoId) {
        logger.info("Starting metadata extraction for video: {}", videoId);
        return stateMachineService.sendEvent(videoId, VideoProcessingEvent.START_METADATA_EXTRACTION);
    }
    
    /**
     * Handle metadata extraction completed successfully
     * @param videoId The ID of the video
     * @return true if state transition was successful
     */
    @Transactional
    public boolean handleMetadataExtractionSucceeded(UUID videoId) {
        logger.info("Metadata extraction succeeded for video: {}", videoId);
        return stateMachineService.sendEvent(videoId, VideoProcessingEvent.METADATA_EXTRACTION_SUCCEEDED);
    }
    
    /**
     * Handle metadata extraction failed
     * @param videoId The ID of the video
     * @param errorMessage Error details
     * @return true if state transition was successful
     */
    @Transactional
    public boolean handleMetadataExtractionFailed(UUID videoId, String errorMessage) {
        logger.error("Metadata extraction failed for video {}: {}", videoId, errorMessage);
        
        boolean success = stateMachineService.sendEvent(videoId, VideoProcessingEvent.METADATA_EXTRACTION_FAILED);
        
        if (success) {
            videoService.updateVideoStatus(videoId, VideoStatus.FAILED);
        }
        
        return success;
    }
    
    /**
     * Start thumbnail generation step
     * @param videoId The ID of the video
     * @return true if state transition was successful
     */
    @Transactional
    public boolean startThumbnailGeneration(UUID videoId) {
        logger.info("Starting thumbnail generation for video: {}", videoId);
        return stateMachineService.sendEvent(videoId, VideoProcessingEvent.START_THUMBNAIL_GENERATION);
    }
    
    /**
     * Handle thumbnail generation completed successfully
     * @param videoId The ID of the video
     * @return true if state transition was successful
     */
    @Transactional
    public boolean handleThumbnailGenerationSucceeded(UUID videoId) {
        logger.info("Thumbnail generation succeeded for video: {}", videoId);
        
        boolean success = stateMachineService.sendEvent(videoId, VideoProcessingEvent.THUMBNAIL_GENERATION_SUCCEEDED);
        
        if (success) {
            videoService.updateVideoStatus(videoId, VideoStatus.READY);
        }
        
        return success;
    }
    
    /**
     * Handle thumbnail generation failed
     * @param videoId The ID of the video
     * @param errorMessage Error details
     * @return true if state transition was successful
     */
    @Transactional
    public boolean handleThumbnailGenerationFailed(UUID videoId, String errorMessage) {
        logger.error("Thumbnail generation failed for video {}: {}", videoId, errorMessage);
        
        boolean success = stateMachineService.sendEvent(videoId, VideoProcessingEvent.THUMBNAIL_GENERATION_FAILED);
        
        if (success) {
            videoService.updateVideoStatus(videoId, VideoStatus.FAILED);
        }
        
        return success;
    }
    
    /**
     * Mark a video as failed at any point in the workflow
     * @param videoId The ID of the video
     * @param errorMessage Error details
     * @return true if state transition was successful
     */
    @Transactional
    public boolean markAsFailed(UUID videoId, String errorMessage) {
        logger.error("Marking video {} as failed: {}", videoId, errorMessage);
        
        // First update the state machine
        boolean success = stateMachineService.handleFailure(videoId, errorMessage);
        
        // Then update the domain model
        if (success) {
            videoService.updateVideoStatus(videoId, VideoStatus.FAILED);
        }
        
        return success;
    }
    
    /**
     * Delete a video and update the state machine
     * @param videoId The ID of the video to delete
     * @return true if deletion was successful
     */
    @Transactional
    public boolean deleteVideo(UUID videoId) {
        logger.info("Deleting video: {}", videoId);
        
        boolean domainDeleted = videoService.deleteVideo(videoId);
        
        if (domainDeleted) {
            // Also update state machine to reflect deletion
            stateMachineService.sendEvent(videoId, VideoProcessingEvent.DELETE);
        }
        
        return domainDeleted;
    }
    
    /**
     * Get the current processing state for a video
     * @param videoId The ID of the video
     * @return The current state
     */
    public VideoProcessingState getProcessingState(UUID videoId) {
        return stateMachineService.getCurrentState(videoId);
    }
    
    /**
     * Perform recovery for a failed video
     * @param videoId The ID of the video
     * @param targetState The state to reset to for retry
     * @return true if recovery was initiated
     */
    @Transactional
    public boolean recoverVideo(UUID videoId, VideoProcessingState targetState) {
        logger.info("Attempting recovery for video {} to state {}", videoId, targetState);
        
        try {
            // Check if video exists and is in FAILED state
            Video video = videoService.getVideo(videoId)
                .orElseThrow(() -> new VideoNotFoundException(videoId));
            
            if (video.getStatus() != VideoStatus.FAILED) {
                logger.warn("Cannot recover video {} as it's not in FAILED state. Current state: {}", 
                            videoId, video.getStatus());
                return false;
            }
            
            // Reset state machine
            boolean reset = stateMachineService.retryProcessing(videoId, targetState);
            
            if (reset) {
                // Update domain model status based on target state
                VideoStatus newStatus = VideoProcessingStateMachineService.mapToDomainStatus(targetState);
                videoService.updateVideoStatus(videoId, newStatus);
                
                logger.info("Successfully recovered video {} to state {}", videoId, targetState);
                return true;
            }
            
            return false;
        } catch (Exception e) {
            logger.error("Error recovering video {}: {}", videoId, e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Start compensating transaction for failed video processing
     * @param videoId The ID of the video
     * @return true if compensating transaction was started
     */
    @Transactional
    public boolean startRollback(UUID videoId) {
        logger.info("Starting rollback for video: {}", videoId);
        return stateMachineService.startCompensatingTransaction(videoId);
    }
    
    /**
     * Complete compensating transaction
     * @param videoId The ID of the video
     */
    @Transactional
    public void completeRollback(UUID videoId) {
        logger.info("Completing rollback for video: {}", videoId);
        stateMachineService.completeCompensatingTransaction(videoId);
    }
}
