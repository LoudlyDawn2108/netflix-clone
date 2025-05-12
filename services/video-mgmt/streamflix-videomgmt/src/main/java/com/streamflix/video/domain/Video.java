package com.streamflix.video.domain;

import jakarta.persistence.*;
import jakarta.persistence.Index;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "videos", indexes = {
    @Index(name = "idx_video_title", columnList = "title"),
    @Index(name = "idx_video_release_year", columnList = "release_year"),
    @Index(name = "idx_video_language", columnList = "language"),
    @Index(name = "idx_video_status", columnList = "status"),
    @Index(name = "idx_video_created_at", columnList = "created_at"),
    @Index(name = "idx_video_category_id", columnList = "category_id")
})
@NamedEntityGraph(
    name = "Video.withCategoryAndThumbnails",
    attributeNodes = {
        @NamedAttributeNode("category"),
        @NamedAttributeNode("thumbnails")
    }
)
public class Video implements MultiTenantEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ElementCollection
    @CollectionTable(name = "video_tags", joinColumns = @JoinColumn(name = "video_id"))
    private Set<String> tags = new HashSet<>();

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "release_year")
    private Integer releaseYear;

    @Column(length = 10)
    private String language;

    @OneToMany(mappedBy = "video", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Thumbnail> thumbnails = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VideoStatus status = VideoStatus.PENDING;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "contains_personal_data")
    private boolean containsPersonalData = false;
    
    @Column(name = "is_anonymized")
    private boolean isAnonymized = false;    
    
    @Column(name = "archived")
    private boolean archived = false;
    
    @Column(name = "archived_at")
    private LocalDateTime archivedAt;
    
    @Column(name = "archive_storage_location")
    private String archiveStorageLocation;
    
    @Column(name = "storage_location")
    private String storageLocation;

    // Default constructor for JPA
    protected Video() {}
    
    // Constructor for creating new videos
    public Video(String title, String description, UUID tenantId, UUID userId) {
        this.title = title;
        this.description = description;
        this.status = VideoStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.tenantId = tenantId;
        this.userId = userId;
    }
    
    // Constructor without user ID
    public Video(String title, String description, UUID tenantId) {
        this(title, description, tenantId, null);
    }
    
    // Legacy constructor for backward compatibility
    public Video(String title, String description) {
        this(title, description, null, null); // Default to null tenant ID and user ID
    }

    // Getters and setters
    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
        this.updateLastModifiedDate();
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
        this.updateLastModifiedDate();
    }

    public Set<String> getTags() {
        return Collections.unmodifiableSet(tags);
    }

    public void addTag(String tag) {
        this.tags.add(tag);
        this.updateLastModifiedDate();
    }

    public void removeTag(String tag) {
        this.tags.remove(tag);
        this.updateLastModifiedDate();
    }

    public void setTags(Set<String> tags) {
        this.tags = new HashSet<>(tags);
        this.updateLastModifiedDate();
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
        this.updateLastModifiedDate();
    }

    public Integer getReleaseYear() {
        return releaseYear;
    }

    public void setReleaseYear(Integer releaseYear) {
        this.releaseYear = releaseYear;
        this.updateLastModifiedDate();
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
        this.updateLastModifiedDate();
    }

    public List<Thumbnail> getThumbnails() {
        return Collections.unmodifiableList(thumbnails);
    }

    public void addThumbnail(Thumbnail thumbnail) {
        thumbnail.setVideo(this);
        this.thumbnails.add(thumbnail);
        this.updateLastModifiedDate();
    }

    public void removeThumbnail(Thumbnail thumbnail) {
        this.thumbnails.remove(thumbnail);
        thumbnail.setVideo(null);
        this.updateLastModifiedDate();
    }
    
    /**
     * Remove a thumbnail by its ID
     * @param thumbnailId The ID of the thumbnail to remove
     * @return true if the thumbnail was found and removed, false otherwise
     */
    public boolean removeThumbnailById(UUID thumbnailId) {
        Iterator<Thumbnail> iterator = this.thumbnails.iterator();
        while (iterator.hasNext()) {
            Thumbnail thumbnail = iterator.next();
            if (thumbnail.getId() != null && thumbnail.getId().equals(thumbnailId)) {
                iterator.remove();
                thumbnail.setVideo(null);
                this.updateLastModifiedDate();
                return true;
            }
        }
        return false;
    }

    public VideoStatus getStatus() {
        return status;
    }

    public void setStatus(VideoStatus status) {
        this.status = status;
        this.updateLastModifiedDate();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public UUID getTenantId() {
        return tenantId;
    }
    
    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public UUID getUserId() {
        return userId;
    }
    
    public void setUserId(UUID userId) {
        this.userId = userId;
    }
    
    public boolean isContainsPersonalData() {
        return containsPersonalData;
    }
    
    public void setContainsPersonalData(boolean containsPersonalData) {
        this.containsPersonalData = containsPersonalData;
    }
    
    public boolean isAnonymized() {
        return isAnonymized;
    }
    
    public void setAnonymized(boolean anonymized) {
        isAnonymized = anonymized;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public LocalDateTime getArchivedAt() {
        return archivedAt;
    }

    public void setArchivedAt(LocalDateTime archivedAt) {
        this.archivedAt = archivedAt;
    }

    public String getArchiveStorageLocation() {
        return archiveStorageLocation;
    }

    public void setArchiveStorageLocation(String archiveStorageLocation) {
        this.archiveStorageLocation = archiveStorageLocation;
    }

    public String getStorageLocation() {
        return storageLocation;
    }

    public void setStorageLocation(String storageLocation) {
        this.storageLocation = storageLocation;
    }

    private void updateLastModifiedDate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Business logic methods
    public void markAsUploaded() {
        if (this.status == VideoStatus.PENDING) {
            this.status = VideoStatus.UPLOADED;
            updateLastModifiedDate();
        } else {
            throw new IllegalStateException("Video must be in PENDING state to be marked as UPLOADED");
        }
    }

    public void markAsProcessing() {
        if (this.status == VideoStatus.UPLOADED) {
            this.status = VideoStatus.PROCESSING;
            updateLastModifiedDate();
        } else {
            throw new IllegalStateException("Video must be in UPLOADED state to be marked as PROCESSING");
        }
    }

    public void markAsReady() {
        if (this.status == VideoStatus.PROCESSING) {
            this.status = VideoStatus.READY;
            updateLastModifiedDate();
        } else {
            throw new IllegalStateException("Video must be in PROCESSING state to be marked as READY");
        }
    }

    public void markAsFailed() {
        if (this.status == VideoStatus.PROCESSING || this.status == VideoStatus.UPLOADED) {
            this.status = VideoStatus.FAILED;
            updateLastModifiedDate();
        } else {
            throw new IllegalStateException("Video must be in PROCESSING or UPLOADED state to be marked as FAILED");
        }
    }

    public void markAsDeleted() {
        this.status = VideoStatus.DELETED;
        updateLastModifiedDate();
    }

    // Equals, hashCode and toString methods
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Video video = (Video) o;
        return Objects.equals(id, video.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Video{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", status=" + status +
                ", createdAt=" + createdAt +
                '}';
    }
}