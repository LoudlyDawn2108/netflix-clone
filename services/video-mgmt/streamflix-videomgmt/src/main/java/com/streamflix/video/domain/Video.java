package com.streamflix.video.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "videos")
public class Video {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

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

    // Default constructor for JPA
    protected Video() {}
    
    // Constructor for creating new videos
    public Video(String title, String description) {
        this.title = title;
        this.description = description;
        this.status = VideoStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
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