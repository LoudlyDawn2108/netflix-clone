package com.streamflix.video.domain.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Represents a tenant in the multi-tenant architecture.
 * Each tenant can be a different customer or organization.
 */
@Entity
@Table(name = "tenants")
public class Tenant {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @Column(nullable = false, unique = true)
    private String identifier;
    
    @Column(name = "subscription_level")
    @Enumerated(EnumType.STRING)
    private SubscriptionLevel subscriptionLevel = SubscriptionLevel.STANDARD;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "active")
    private boolean active = true;
    
    // Subscription levels for different tenant capabilities
    public enum SubscriptionLevel {
        BASIC,
        STANDARD,
        PREMIUM,
        ENTERPRISE
    }
    
    // Default constructor for JPA
    protected Tenant() {}
    
    // Constructor for creating new tenants
    public Tenant(String name, String identifier, SubscriptionLevel subscriptionLevel) {
        this.name = name;
        this.identifier = identifier;
        this.subscriptionLevel = subscriptionLevel;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters and setters
    public UUID getId() {
        return id;
    }
    
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
    
    public SubscriptionLevel getSubscriptionLevel() {
        return subscriptionLevel;
    }
    
    public void setSubscriptionLevel(SubscriptionLevel subscriptionLevel) {
        this.subscriptionLevel = subscriptionLevel;
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
    
    public void setActive(boolean active) {
        this.active = active;
    }
    
    // Equals and HashCode based on the business identifier
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Tenant tenant = (Tenant) o;
        return Objects.equals(identifier, tenant.identifier);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(identifier);
    }
    
    @Override
    public String toString() {
        return "Tenant{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", identifier='" + identifier + '\'' +
                ", subscriptionLevel=" + subscriptionLevel +
                ", active=" + active +
                '}';
    }
}
