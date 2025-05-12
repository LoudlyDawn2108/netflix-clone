package com.streamflix.video.infrastructure.statemachine;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for monitoring video processing workflows and handling error recovery.
 */
@Service
public class VideoWorkflowMonitoringService {
    
    private static final Logger logger = LoggerFactory.getLogger(VideoWorkflowMonitoringService.class);
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final long RETRY_DELAY_MS = TimeUnit.MINUTES.toMillis(5);
    
    private final VideoProcessingStateRepository stateRepository;
    private final VideoProcessingStateMachineService stateMachineService;
    private final VideoProcessingAdapter processingAdapter;
    private final MeterRegistry meterRegistry;
    
    // Metrics
    private final Map<VideoProcessingState, Counter> stateCounters = new EnumMap<>(VideoProcessingState.class);
    private final Counter compensationCounter;
    private final Counter retryCounter;
    
    public VideoWorkflowMonitoringService(
            VideoProcessingStateRepository stateRepository,
            VideoProcessingStateMachineService stateMachineService,
            VideoProcessingAdapter processingAdapter,
            MeterRegistry meterRegistry) {
        this.stateRepository = stateRepository;
        this.stateMachineService = stateMachineService;
        this.processingAdapter = processingAdapter;
        this.meterRegistry = meterRegistry;
        
        // Initialize metrics
        for (VideoProcessingState state : VideoProcessingState.values()) {
            stateCounters.put(state, Counter.builder("video.processing.state")
                .tag("state", state.name())
                .description("Number of videos in " + state.name() + " state")
                .register(meterRegistry));
        }
        
        compensationCounter = Counter.builder("video.processing.compensations")
            .description("Number of compensating transactions executed")
            .register(meterRegistry);
            
        retryCounter = Counter.builder("video.processing.retries")
            .description("Number of retry attempts")
            .register(meterRegistry);
    }
    
    /**
     * Update metrics for video processing states
     * Run every 5 minutes
     */
    @Scheduled(fixedRate = 300000)
    @Transactional(readOnly = true)
    public void updateStateMetrics() {
        logger.debug("Updating video processing state metrics");
        
        for (VideoProcessingState state : VideoProcessingState.values()) {
            long count = stateRepository.findByCurrentState(state).size();
            stateCounters.get(state).increment(count - stateCounters.get(state).count());
            
            logger.debug("Current count for state {}: {}", state, count);
        }
    }
    
    /**
     * Check for videos that need recovery and retry them
     * Run every 15 minutes
     */
    @Scheduled(fixedRate = 900000)
    @Transactional
    public void recoverFailedWorkflows() {
        logger.info("Checking for failed workflows that can be recovered");
        
        List<UUID> recoverableVideos = stateMachineService.getRecoverableVideos(MAX_RETRY_ATTEMPTS);
        
        logger.info("Found {} videos that can be retried", recoverableVideos.size());
        
        for (UUID videoId : recoverableVideos) {
            retryCounter.increment();
            
            // For each video, determine the best state to retry from
            boolean recovered = processingAdapter.recoverVideo(videoId, VideoProcessingState.UPLOADED);
            
            if (recovered) {
                logger.info("Successfully initiated recovery for video: {}", videoId);
            } else {
                logger.warn("Failed to initiate recovery for video: {}", videoId);
            }
        }
    }
    
    /**
     * Process compensating transactions for videos
     * Run every 10 minutes
     */
    @Scheduled(fixedRate = 600000)
    @Transactional
    public void processCompensatingTransactions() {
        logger.info("Processing compensating transactions");
        
        List<UUID> videosForRollback = stateMachineService.getVideosNeedingCompensation();
        
        logger.info("Found {} videos needing compensation", videosForRollback.size());
        
        for (UUID videoId : videosForRollback) {
            compensationCounter.increment();
            
            try {
                // Perform compensating actions (cleanup resources, etc.)
                logger.info("Executing compensating transaction for video: {}", videoId);
                
                // TODO: Add specific compensating actions here
                // e.g., clean up S3 files, transcoding jobs, etc.
                
                // Mark compensation as complete
                processingAdapter.completeRollback(videoId);
                
            } catch (Exception e) {
                logger.error("Error during compensating transaction for video {}: {}",
                        videoId, e.getMessage(), e);
            }
        }
    }
    
    /**
     * Get monitoring summary for all videos
     * @return Map of states to counts
     */
    @Transactional(readOnly = true)
    public Map<VideoProcessingState, Long> getStateSummary() {
        Map<VideoProcessingState, Long> summary = new EnumMap<>(VideoProcessingState.class);
        
        for (VideoProcessingState state : VideoProcessingState.values()) {
            long count = stateRepository.findByCurrentState(state).size();
            summary.put(state, count);
        }
        
        return summary;
    }
}
