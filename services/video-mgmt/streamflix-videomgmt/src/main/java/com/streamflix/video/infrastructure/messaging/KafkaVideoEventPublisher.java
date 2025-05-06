package com.streamflix.video.infrastructure.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamflix.video.application.VideoEventPublisher;
import com.streamflix.video.domain.Video;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Kafka implementation of the VideoEventPublisher interface.
 * This class publishes domain events to Kafka topics.
 */
@Component
public class KafkaVideoEventPublisher implements VideoEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(KafkaVideoEventPublisher.class);
    
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${kafka.topics.video-created}")
    private String videoCreatedTopic;
    
    @Value("${kafka.topics.video-updated}")
    private String videoUpdatedTopic;
    
    @Value("${kafka.topics.video-deleted}")
    private String videoDeletedTopic;
    
    @Value("${kafka.topics.video-status-changed}")
    private String videoStatusChangedTopic;
    
    @Value("${kafka.topics.video-processing-requested}")
    private String videoProcessingRequestedTopic;

    public KafkaVideoEventPublisher(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publishVideoCreated(Video video) {
        publishEvent(videoCreatedTopic, createEventPayload(video, "VIDEO_CREATED"));
    }

    @Override
    public void publishVideoUpdated(Video video) {
        publishEvent(videoUpdatedTopic, createEventPayload(video, "VIDEO_UPDATED"));
    }

    @Override
    public void publishVideoStatusChanged(Video video) {
        publishEvent(videoStatusChangedTopic, createEventPayload(video, "VIDEO_STATUS_CHANGED"));
    }

    @Override
    public void publishVideoDeleted(Video video) {
        publishEvent(videoDeletedTopic, createEventPayload(video, "VIDEO_DELETED"));
    }

    @Override
    public void publishVideoProcessingRequested(Video video) {
        publishEvent(videoProcessingRequestedTopic, createEventPayload(video, "VIDEO_PROCESSING_REQUESTED"));
    }
    
    /**
     * Helper method to create a standardized event payload
     */
    private VideoEvent createEventPayload(Video video, String eventType) {
        VideoEvent event = new VideoEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setEventType(eventType);
        event.setTimestamp(System.currentTimeMillis());
        event.setVideoId(video.getId().toString());
        event.setVideoTitle(video.getTitle());
        event.setVideoStatus(video.getStatus().toString());
        return event;
    }
    
    /**
     * Helper method to publish an event to a Kafka topic
     */
    private void publishEvent(String topic, VideoEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            String key = event.getVideoId();
            
            logger.info("Publishing event {} to topic {}: {}", event.getEventType(), topic, payload);
            
            kafkaTemplate.send(topic, key, payload)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        logger.debug("Event sent successfully to topic {}: {}", topic, payload);
                    } else {
                        logger.error("Failed to send event to topic {}: {}", topic, ex.getMessage(), ex);
                    }
                });
        } catch (JsonProcessingException e) {
            logger.error("Error serializing event: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Inner class representing the structure of a video event
     */
    static class VideoEvent {
        private String eventId;
        private String eventType;
        private long timestamp;
        private String videoId;
        private String videoTitle;
        private String videoStatus;
        
        // Getters and setters
        
        public String getEventId() {
            return eventId;
        }
        
        public void setEventId(String eventId) {
            this.eventId = eventId;
        }
        
        public String getEventType() {
            return eventType;
        }
        
        public void setEventType(String eventType) {
            this.eventType = eventType;
        }
        
        public long getTimestamp() {
            return timestamp;
        }
        
        public void setTimestamp(long timestamp) {
            this.timestamp = timestamp;
        }
        
        public String getVideoId() {
            return videoId;
        }
        
        public void setVideoId(String videoId) {
            this.videoId = videoId;
        }
        
        public String getVideoTitle() {
            return videoTitle;
        }
        
        public void setVideoTitle(String videoTitle) {
            this.videoTitle = videoTitle;
        }
        
        public String getVideoStatus() {
            return videoStatus;
        }
        
        public void setVideoStatus(String videoStatus) {
            this.videoStatus = videoStatus;
        }
    }
}