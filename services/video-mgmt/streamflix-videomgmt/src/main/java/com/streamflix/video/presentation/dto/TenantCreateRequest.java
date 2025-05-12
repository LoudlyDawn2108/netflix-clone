package com.streamflix.video.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * DTO for creating a new tenant
 */
public class TenantCreateRequest {
    
    @NotBlank(message = "Tenant name is required")
    private String name;
    
    @NotBlank(message = "Tenant identifier is required")
    @Pattern(regexp = "^[a-z0-9-]{3,30}$", message = "Identifier must be 3-30 lowercase letters, numbers, or hyphens")
    private String identifier;
    
    @NotBlank(message = "Subscription level is required")
    @Pattern(regexp = "BASIC|STANDARD|PREMIUM|ENTERPRISE", message = "Invalid subscription level")
    private String subscriptionLevel;
    
    // Default constructor
    public TenantCreateRequest() {}
    
    // Constructor
    public TenantCreateRequest(String name, String identifier, String subscriptionLevel) {
        this.name = name;
        this.identifier = identifier;
        this.subscriptionLevel = subscriptionLevel;
    }
    
    // Getters and setters
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getIdentifier() {
        return identifier;
    }
    
    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }
    
    public String getSubscriptionLevel() {
        return subscriptionLevel;
    }
    
    public void setSubscriptionLevel(String subscriptionLevel) {
        this.subscriptionLevel = subscriptionLevel;
    }
}
