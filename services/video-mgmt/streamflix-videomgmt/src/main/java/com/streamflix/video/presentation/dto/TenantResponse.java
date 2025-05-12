package com.streamflix.video.presentation.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for tenant response
 */
public class TenantResponse {
    
    private UUID id;
    private String name;
    private String identifier;
    private String subscriptionLevel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean active;
    
    // Default constructor
    public TenantResponse() {}
    
    // Constructor
    public TenantResponse(
            UUID id, 
            String name, 
            String identifier, 
            String subscriptionLevel,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            boolean active) {
        this.id = id;
        this.name = name;
        this.identifier = identifier;
        this.subscriptionLevel = subscriptionLevel;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.active = active;
    }
    
    // Getters
    public UUID getId() {
        return id;
    }
    
    public String getName() {
        return name;
    }
    
    public String getIdentifier() {
        return identifier;
    }
    
    public String getSubscriptionLevel() {
        return subscriptionLevel;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public boolean isActive() {
        return active;
    }
}
