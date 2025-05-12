package com.streamflix.video.infrastructure.statemachine;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.statemachine.StateMachine;
import org.springframework.statemachine.config.StateMachineFactory;
import org.springframework.statemachine.service.StateMachineService;
import org.springframework.statemachine.support.DefaultStateMachineContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Service for managing video processing workflows using Spring State Machine.
 */
@Service
public class VideoProcessingStateMachineService {
    
    private static final Logger logger = LoggerFactory.getLogger(VideoProcessingStateMachineService.class);
    private static final String MACHINE_ID_PREFIX = "video-processing-";
    
    private final StateMachineFactory<VideoProcessingState, VideoProcessingEvent> stateMachineFactory;
    private final VideoStateMachineListener stateMachineListener;
    private final VideoProcessingStateRepository stateRepository;
    private final StateMachineService<VideoProcessingState, VideoProcessingEvent> stateMachineService;
    
    public VideoProcessingStateMachineService(
            StateMachineFactory<VideoProcessingState, VideoProcessingEvent> stateMachineFactory,
            VideoStateMachineListener stateMachineListener,
            VideoProcessingStateRepository stateRepository,
            StateMachineService<VideoProcessingState, VideoProcessingEvent> stateMachineService) {
        this.stateMachineFactory = stateMachineFactory;
        this.stateMachineListener = stateMachineListener;
        this.stateRepository = stateRepository;
        this.stateMachineService = stateMachineService;
    }
    
    /**
     * Initialize a state machine for a newly created video
     * @param video The video entity
     * @return VideoProcessingStateEntity The created state entity
     */
    @Transactional
    public VideoProcessingStateEntity initializeStateMachine(Video video) {
        UUID videoId = video.getId();
        
        // Create and save state entity
        VideoProcessingStateEntity stateEntity = new VideoProcessingStateEntity(videoId);
        stateEntity = stateRepository.save(stateEntity);
        
        logger.info("Initialized state machine for video: {}", videoId);
        return stateEntity;
    }
    
    /**
     * Send an event to a video's state machine to trigger a state transition
     * @param videoId The ID of the video
     * @param event The event to send
     * @return true if the event was accepted and processed
     */
    @Transactional
    public boolean sendEvent(UUID videoId, VideoProcessingEvent event) {
        logger.info("Sending event {} to video {}", event, videoId);
        
        // Get or create state entity
        VideoProcessingStateEntity stateEntity = stateRepository.findById(videoId)
            .orElseGet(() -> {
                VideoProcessingStateEntity newEntity = new VideoProcessingStateEntity(videoId);
                return stateRepository.save(newEntity);
            });
        
        // Get or create state machine
        StateMachine<VideoProcessingState, VideoProcessingEvent> stateMachine = getStateMachineForVideo(videoId);
        
        // Update state entity with event
        stateEntity.setLastEvent(event.toString());
        stateRepository.save(stateEntity);
        
        // Send event to state machine
        boolean result = stateMachine.sendEvent(event);
        
        if (!result) {
            logger.warn("Event {} was not accepted by state machine for video {}", event, videoId);
        }
        
        return result;
    }
    
    /**
     * Send an event to a video's state machine asynchronously
     * @param videoId The ID of the video
     * @param event The event to send
     * @return CompletableFuture that completes with true if event was accepted
     */
    public CompletableFuture<Boolean> sendEventAsync(UUID videoId, VideoProcessingEvent event) {
        return CompletableFuture.supplyAsync(() -> sendEvent(videoId, event));
    }
    
    /**
     * Get current state for a video
     * @param videoId The ID of the video
     * @return The current processing state
     */
    @Transactional(readOnly = true)
    public VideoProcessingState getCurrentState(UUID videoId) {
        return stateRepository.findById(videoId)
            .map(VideoProcessingStateEntity::getCurrentState)
            .orElse(VideoProcessingState.PENDING);
    }
    
    /**
     * Check if the video is in an end state (READY, FAILED, or DELETED)
     * @param videoId The ID of the video
     * @return true if the video is in an end state
     */
    @Transactional(readOnly = true)
    public boolean isInEndState(UUID videoId) {
        VideoProcessingState state = getCurrentState(videoId);
        return state == VideoProcessingState.READY ||
               state == VideoProcessingState.FAILED ||
               state == VideoProcessingState.DELETED;
    }
    
    /**
     * Handle a failure in the video processing workflow
     * @param videoId The ID of the video
     * @param errorMessage The error message
     * @return true if the failure was handled successfully
     */
    @Transactional
    public boolean handleFailure(UUID videoId, String errorMessage) {
        logger.error("Handling failure for video {}: {}", videoId, errorMessage);
        
        stateRepository.findById(videoId).ifPresent(entity -> {
            entity.setErrorDetails(errorMessage);
            stateRepository.save(entity);
        });
        
        return sendEvent(videoId, VideoProcessingEvent.MARK_AS_FAILED);
    }
    
    /**
     * Start compensating transaction for a failed video
     * @param videoId The ID of the video
     * @return true if compensating transaction was started
     */
    @Transactional
    public boolean startCompensatingTransaction(UUID videoId) {
        logger.info("Starting compensating transaction for video {}", videoId);
        
        return stateRepository.findById(videoId)
            .map(entity -> {
                entity.setCompensatingTransaction(true);
                stateRepository.save(entity);
                return true;
            })
            .orElse(false);
    }
    
    /**
     * Complete compensating transaction for a video
     * @param videoId The ID of the video
     */
    @Transactional
    public void completeCompensatingTransaction(UUID videoId) {
        logger.info("Completing compensating transaction for video {}", videoId);
        
        stateRepository.findById(videoId).ifPresent(entity -> {
            entity.setCompensatingTransaction(false);
            entity.resetRetryCount();
            stateRepository.save(entity);
        });
    }
    
    /**
     * Map VideoProcessingState to domain VideoStatus
     * @param processingState The state machine state
     * @return Corresponding domain status
     */
    public static VideoStatus mapToDomainStatus(VideoProcessingState processingState) {
        return switch (processingState) {
            case PENDING -> VideoStatus.PENDING;
            case UPLOADED -> VideoStatus.UPLOADED;
            case VALIDATING, TRANSCODING, EXTRACTING_METADATA, GENERATING_THUMBNAILS -> VideoStatus.PROCESSING;
            case READY -> VideoStatus.READY;
            case FAILED -> VideoStatus.FAILED;
            case DELETED -> VideoStatus.DELETED;
        };
    }
    
    /**
     * Return videos that need recovery (in failed state with retry count < max)
     * @param maxRetries Maximum number of retries allowed
     * @return List of video IDs that can be retried
     */
    @Transactional(readOnly = true)
    public List<UUID> getRecoverableVideos(int maxRetries) {
        return stateRepository.findByCurrentState(VideoProcessingState.FAILED)
            .stream()
            .filter(entity -> entity.getRetryCount() < maxRetries)
            .map(VideoProcessingStateEntity::getVideoId)
            .toList();
    }
    
    /**
     * Get videos that need compensating transactions
     * @return List of video IDs that need rollback
     */
    @Transactional(readOnly = true)
    public List<UUID> getVideosNeedingCompensation() {
        return stateRepository.findByCompensatingTransactionTrue()
            .stream()
            .map(VideoProcessingStateEntity::getVideoId)
            .toList();
    }
    
    /**
     * Retry processing for a failed video
     * @param videoId The ID of the video
     * @param targetState The state to reset to for retry
     * @return true if retry was initiated
     */
    @Transactional
    public boolean retryProcessing(UUID videoId, VideoProcessingState targetState) {
        logger.info("Retrying processing for video {} from state {}", videoId, targetState);
        
        return stateRepository.findById(videoId)
            .map(entity -> {
                // Increment retry count
                entity.incrementRetryCount();
                stateRepository.save(entity);
                
                // Reset state machine to target state
                StateMachine<VideoProcessingState, VideoProcessingEvent> stateMachine = getStateMachineForVideo(videoId);
                stateMachine.stop();
                
                stateMachine.getStateMachineAccessor().doWithAllRegions(accessor -> {
                    accessor.resetStateMachine(new DefaultStateMachineContext<>(targetState, null, null, null));
                });
                
                stateMachine.start();
                return true;
            })
            .orElse(false);
    }
    
    /**
     * Get or create a state machine instance for a video
     * @param videoId The ID of the video
     * @return StateMachine instance configured for this video
     */
    private StateMachine<VideoProcessingState, VideoProcessingEvent> getStateMachineForVideo(UUID videoId) {
        // Generate machine ID from video ID
        String machineId = MACHINE_ID_PREFIX + videoId.toString();
        
        // Try to get existing machine
        StateMachine<VideoProcessingState, VideoProcessingEvent> stateMachine = 
                stateMachineService.acquireStateMachine(machineId);
                
        // Get current state from repository
        VideoProcessingStateEntity stateEntity = stateRepository.findById(videoId)
            .orElseGet(() -> {
                VideoProcessingStateEntity newEntity = new VideoProcessingStateEntity(videoId);
                return stateRepository.save(newEntity);
            });
        
        // Reset machine to current state from database
        stateMachine.getStateMachineAccessor().doWithAllRegions(accessor -> {
            accessor.resetStateMachine(new DefaultStateMachineContext<>(
                stateEntity.getCurrentState(), null, null, null));
            accessor.addStateMachineInterceptor(stateMachineListener);
        });
        
        // Set video ID in extended state
        stateMachine.getExtendedState().getVariables().put("videoId", videoId);
        
        if (!stateMachine.isRunning()) {
            stateMachine.start();
        }
        
        return stateMachine;
    }
}
