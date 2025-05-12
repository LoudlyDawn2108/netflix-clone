package com.streamflix.video.domain.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Entity representing a data retention policy configuration.
 * Defines how long different types of data should be retained.
 */
@Entity
@Table(name = "data_retention_policies")
public class DataRetentionPolicy {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
    
    @Column(name = "active_data_retention_days", nullable = false)
    private Integer activeDataRetentionDays;
    
    @Column(name = "deleted_data_retention_days", nullable = false)
    private Integer deletedDataRetentionDays;
    
    @Column(name = "archive_trigger_days", nullable = false)
    private Integer archiveTriggerDays;
    
    @Column(name = "purge_trigger_days", nullable = false)
    private Integer purgeTriggerDays;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Default constructor for JPA
    protected DataRetentionPolicy() {}
    
    // Constructor for creating new data retention policies
    public DataRetentionPolicy(
            UUID tenantId,
            Integer activeDataRetentionDays,
            Integer deletedDataRetentionDays,
            Integer archiveTriggerDays,
            Integer purgeTriggerDays) {
        this.tenantId = tenantId;
        this.activeDataRetentionDays = activeDataRetentionDays;
        this.deletedDataRetentionDays = deletedDataRetentionDays;
        this.archiveTriggerDays = archiveTriggerDays;
        this.purgeTriggerDays = purgeTriggerDays;
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
    
    public UUID getTenantId() {
        return tenantId;
    }
    
    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }
    
    public Integer getActiveDataRetentionDays() {
        return activeDataRetentionDays;
    }
    
    public void setActiveDataRetentionDays(Integer activeDataRetentionDays) {
        this.activeDataRetentionDays = activeDataRetentionDays;
    }
    
    public Integer getDeletedDataRetentionDays() {
        return deletedDataRetentionDays;
    }
    
    public void setDeletedDataRetentionDays(Integer deletedDataRetentionDays) {
        this.deletedDataRetentionDays = deletedDataRetentionDays;
    }
    
    public Integer getArchiveTriggerDays() {
        return archiveTriggerDays;
    }
    
    public void setArchiveTriggerDays(Integer archiveTriggerDays) {
        this.archiveTriggerDays = archiveTriggerDays;
    }
    
    public Integer getPurgeTriggerDays() {
        return purgeTriggerDays;
    }
    
    public void setPurgeTriggerDays(Integer purgeTriggerDays) {
        this.purgeTriggerDays = purgeTriggerDays;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    // Equals and hashCode
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DataRetentionPolicy that = (DataRetentionPolicy) o;
        return Objects.equals(id, that.id) &&
               Objects.equals(tenantId, that.tenantId);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, tenantId);
    }
    
    @Override
    public String toString() {
        return "DataRetentionPolicy{" +
                "id=" + id +
                ", tenantId=" + tenantId +
                ", activeDataRetentionDays=" + activeDataRetentionDays +
                ", deletedDataRetentionDays=" + deletedDataRetentionDays +
                ", archiveTriggerDays=" + archiveTriggerDays +
                ", purgeTriggerDays=" + purgeTriggerDays +
                '}';
    }
}
