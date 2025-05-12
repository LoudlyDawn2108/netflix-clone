package com.streamflix.video.domain;

import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "thumbnails", indexes = {
    @Index(name = "idx_thumbnail_tenant", columnList = "tenant_id")
})
public class Thumbnail implements MultiTenantEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;
    
    @Column(nullable = false)
    private String url;
    
    @Column(name = "width")
    private Integer width;
    
    @Column(name = "height")
    private Integer height;
    
    @Column(name = "is_default")
    private boolean isDefault = false;
    
    @Column(name = "is_primary")
    private boolean isPrimary = false;
    
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
    
    // Default constructor for JPA
    protected Thumbnail() {}
    
    // Constructor for creating new thumbnails
    public Thumbnail(String url, Integer width, Integer height, UUID tenantId) {
        this.url = url;
        this.width = width;
        this.height = height;
        this.tenantId = tenantId;
    }
    
    // Constructor with just URL and tenant ID
    public Thumbnail(String url, UUID tenantId) {
        this.url = url;
        this.tenantId = tenantId;
    }
    
    // Legacy constructors for backward compatibility
    public Thumbnail(String url, Integer width, Integer height) {
        this(url, width, height, null); // Default to null tenant ID, will be set by service layer
    }
    
    public Thumbnail(String url) {
        this(url, null); // Default to null tenant ID, will be set by service layer
    }
    
    // Getters and setters
    public UUID getId() {
        return id;
    }
    
    public Video getVideo() {
        return video;
    }
    
    public void setVideo(Video video) {
        this.video = video;
    }
    
    public String getUrl() {
        return url;
    }
    
    public void setUrl(String url) {
        this.url = url;
    }
    
    public Integer getWidth() {
        return width;
    }
    
    public void setWidth(Integer width) {
        this.width = width;
    }
    
    public Integer getHeight() {
        return height;
    }
    
    public void setHeight(Integer height) {
        this.height = height;
    }
    
    public boolean isDefault() {
        return isDefault;
    }
    
    public void setDefault(boolean isDefault) {
        this.isDefault = isDefault;
    }
    
    // Added for compatibility with ThumbnailServiceImpl
    public boolean isPrimary() {
        return isPrimary;
    }
    
    // Added for compatibility with ThumbnailServiceImpl
    public void setPrimary(boolean isPrimary) {
        this.isPrimary = isPrimary;
    }
    
    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }
    
    // Equals, hashCode and toString
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Thumbnail thumbnail = (Thumbnail) o;
        return Objects.equals(id, thumbnail.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    @Override
    public String toString() {
        return "Thumbnail{" +
                "id=" + id +
                ", url='" + url + '\'' +
                ", width=" + width +
                ", height=" + height +
                ", isDefault=" + isDefault +
                ", isPrimary=" + isPrimary +
                ", tenantId=" + tenantId +
                '}';
    }
}