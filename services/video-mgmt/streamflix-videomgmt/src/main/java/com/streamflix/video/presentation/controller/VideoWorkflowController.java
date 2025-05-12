package com.streamflix.video.presentation.controller;

import com.streamflix.video.infrastructure.statemachine.VideoProcessingAdapter;
import com.streamflix.video.infrastructure.statemachine.VideoProcessingState;
import com.streamflix.video.infrastructure.statemachine.VideoProcessingStateEntity;
import com.streamflix.video.infrastructure.statemachine.VideoProcessingStateRepository;
import com.streamflix.video.infrastructure.statemachine.VideoWorkflowMonitoringService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REST controller for monitoring and managing video processing workflows
 */
@RestController
@RequestMapping("/api/v1/workflow")
public class VideoWorkflowController {

    private static final Logger logger = LoggerFactory.getLogger(VideoWorkflowController.class);
    
    private final VideoProcessingAdapter processingAdapter;
    private final VideoWorkflowMonitoringService monitoringService;
    private final VideoProcessingStateRepository stateRepository;
    
    public VideoWorkflowController(
            VideoProcessingAdapter processingAdapter,
            VideoWorkflowMonitoringService monitoringService,
            VideoProcessingStateRepository stateRepository) {
        this.processingAdapter = processingAdapter;
        this.monitoringService = monitoringService;
        this.stateRepository = stateRepository;
    }
    
    /**
     * Get processing state for a video
     * @param videoId ID of the video
     * @return Processing state details
     */
    @GetMapping("/{videoId}/status")
    public ResponseEntity<Map<String, Object>> getWorkflowStatus(@PathVariable UUID videoId) {
        logger.info("Getting workflow status for video: {}", videoId);
        
        Optional<VideoProcessingStateEntity> stateEntity = stateRepository.findById(videoId);
        
        if (stateEntity.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> response = new HashMap<>();
        VideoProcessingStateEntity state = stateEntity.get();
        
        response.put("videoId", state.getVideoId());
        response.put("state", state.getCurrentState());
        response.put("lastUpdated", state.getLastUpdated());
        response.put("lastEvent", state.getLastEvent());
        
        if (state.getErrorDetails() != null) {
            response.put("errorDetails", state.getErrorDetails());
        }
        
        response.put("retryCount", state.getRetryCount());
        response.put("isCompensating", state.isCompensatingTransaction());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get summary of workflow states (for dashboard)
     * @return Map of states to counts
     */
    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> getWorkflowSummary() {
        logger.info("Getting workflow state summary");
        
        Map<VideoProcessingState, Long> stateSummary = monitoringService.getStateSummary();
        
        Map<String, Long> response = new HashMap<>();
        stateSummary.forEach((state, count) -> response.put(state.name(), count));
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Manually retry processing for a failed video
     * @param videoId ID of the video
     * @return Success or failure status
     */
    @PostMapping("/{videoId}/retry")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> retryProcessing(@PathVariable UUID videoId) {
        logger.info("Manual retry requested for video: {}", videoId);
        
        boolean success = processingAdapter.recoverVideo(videoId, VideoProcessingState.UPLOADED);
        
        Map<String, Object> response = new HashMap<>();
        response.put("videoId", videoId);
        response.put("success", success);
        
        if (!success) {
            response.put("message", "Could not retry processing. The video may not be in a failed state.");
            return ResponseEntity.badRequest().body(response);
        }
        
        response.put("message", "Processing retry initiated successfully");
        return ResponseEntity.ok(response);
    }
    
    /**
     * Manually trigger rollback for a video
     * @param videoId ID of the video
     * @return Success or failure status
     */
    @PostMapping("/{videoId}/rollback")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> triggerRollback(@PathVariable UUID videoId) {
        logger.info("Manual rollback requested for video: {}", videoId);
        
        boolean success = processingAdapter.startRollback(videoId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("videoId", videoId);
        response.put("success", success);
        
        if (!success) {
            response.put("message", "Could not start rollback. The video may not exist.");
            return ResponseEntity.badRequest().body(response);
        }
        
        response.put("message", "Rollback initiated successfully");
        return ResponseEntity.ok(response);
    }
}
