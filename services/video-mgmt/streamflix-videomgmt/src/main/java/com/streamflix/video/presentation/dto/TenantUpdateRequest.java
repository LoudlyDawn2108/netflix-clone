package com.streamflix.video.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * DTO for updating a tenant's subscription level
 */
public class TenantUpdateRequest {
    
    @NotBlank(message = "Subscription level is required")
    @Pattern(regexp = "BASIC|STANDARD|PREMIUM|ENTERPRISE", message = "Invalid subscription level")
    private String subscriptionLevel;
    
    // Default constructor
    public TenantUpdateRequest() {}
    
    // Constructor
    public TenantUpdateRequest(String subscriptionLevel) {
        this.subscriptionLevel = subscriptionLevel;
    }
    
    // Getters and setters
    public String getSubscriptionLevel() {
        return subscriptionLevel;
    }
    
    public void setSubscriptionLevel(String subscriptionLevel) {
        this.subscriptionLevel = subscriptionLevel;
    }
}
