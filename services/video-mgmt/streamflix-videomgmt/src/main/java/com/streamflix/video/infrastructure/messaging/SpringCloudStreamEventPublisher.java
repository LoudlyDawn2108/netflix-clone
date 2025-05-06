package com.streamflix.video.infrastructure.messaging;

import com.streamflix.video.application.VideoEventPublisher;
import com.streamflix.video.domain.Video;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Spring Cloud Stream implementation of the VideoEventPublisher interface.
 * This class publishes domain events to Kafka topics using Spring Cloud Stream's StreamBridge.
 */
@Component
public class SpringCloudStreamEventPublisher implements VideoEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(SpringCloudStreamEventPublisher.class);
    
    private final StreamBridge streamBridge;
    private final EventSerializer eventSerializer;

    public SpringCloudStreamEventPublisher(StreamBridge streamBridge, EventSerializer eventSerializer) {
        this.streamBridge = streamBridge;
        this.eventSerializer = eventSerializer;
    }

    @Override
    public void publishVideoCreated(Video video) {
        Map<String, Object> eventPayload = createEventPayload(video, "VIDEO_CREATED");
        publishEvent(VideoEventChannels.VIDEO_CREATED_OUTPUT, eventPayload);
    }

    @Override
    public void publishVideoUpdated(Video video) {
        Map<String, Object> eventPayload = createEventPayload(video, "VIDEO_UPDATED");
        publishEvent(VideoEventChannels.VIDEO_UPDATED_OUTPUT, eventPayload);
    }

    @Override
    public void publishVideoStatusChanged(Video video) {
        Map<String, Object> eventPayload = createEventPayload(video, "VIDEO_STATUS_CHANGED");
        publishEvent(VideoEventChannels.VIDEO_STATUS_CHANGED_OUTPUT, eventPayload);
    }

    @Override
    public void publishVideoDeleted(Video video) {
        Map<String, Object> eventPayload = createEventPayload(video, "VIDEO_DELETED");
        publishEvent(VideoEventChannels.VIDEO_DELETED_OUTPUT, eventPayload);
    }

    @Override
    public void publishVideoProcessingRequested(Video video) {
        Map<String, Object> eventPayload = createEventPayload(video, "VIDEO_PROCESSING_REQUESTED");
        publishEvent(VideoEventChannels.VIDEO_PROCESSING_REQUESTED_OUTPUT, eventPayload);
    }
    
    /**
     * Helper method to create a standardized event payload
     */
    private Map<String, Object> createEventPayload(Video video, String eventType) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventId", UUID.randomUUID().toString());
        event.put("eventType", eventType);
        event.put("timestamp", System.currentTimeMillis());
        event.put("videoId", video.getId().toString());
        event.put("videoTitle", video.getTitle());
        event.put("videoStatus", video.getStatus().toString());
        
        // Add additional metadata based on event type
        if ("VIDEO_CREATED".equals(eventType) || "VIDEO_UPDATED".equals(eventType)) {
            event.put("description", video.getDescription());
            
            if (video.getCategory() != null) {
                event.put("categoryId", video.getCategory().getId().toString());
                event.put("categoryName", video.getCategory().getName());
            }
            
            event.put("tags", video.getTags());
            event.put("releaseYear", video.getReleaseYear());
            event.put("language", video.getLanguage());
        }
        
        return event;
    }
    
    /**
     * Helper method to publish an event to a Spring Cloud Stream binding
     */
    private void publishEvent(String bindingName, Map<String, Object> event) {
        try {
            logger.info("Publishing event {} to binding {}: {}", 
                        event.get("eventType"), bindingName, event);
                        
            boolean sent = streamBridge.send(bindingName, event);
            
            if (sent) {
                logger.debug("Event sent successfully to binding {}: {}", bindingName, event);
            } else {
                logger.error("Failed to send event to binding {}: {}", bindingName, event);
            }
        } catch (Exception e) {
            logger.error("Error publishing event to binding {}: {}", bindingName, e.getMessage(), e);
        }
    }
}