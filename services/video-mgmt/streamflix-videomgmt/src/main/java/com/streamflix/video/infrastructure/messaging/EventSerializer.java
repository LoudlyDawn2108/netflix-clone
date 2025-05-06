package com.streamflix.video.infrastructure.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Serializer for converting event objects to JSON format.
 */
@Component
public class EventSerializer {
    private static final Logger logger = LoggerFactory.getLogger(EventSerializer.class);
    private final ObjectMapper objectMapper;

    public EventSerializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Serialize an event object to JSON string
     * 
     * @param event The event object to serialize
     * @return JSON string representation of the event or null if serialization fails
     */
    public String serialize(Object event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize event: {}", e.getMessage(), e);
            return null;
        }
    }
}