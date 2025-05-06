package com.streamflix.video.presentation.dto;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Response DTO for Video API endpoints with additional metadata.
 */
public class VideoResponse {
    private UUID id;
    private String title;
    private String description;
    private CategoryDTO category;
    private Set<String> tags;
    private Integer releaseYear;
    private String language;
    private List<ThumbnailDTO> thumbnails;
    private VideoStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String resourceUrl;
    private List<String> thumbnailUrls;

    // Default constructor
    public VideoResponse() {}

    // Constructor from VideoDTO
    public VideoResponse(VideoDTO videoDTO) {
        this.id = videoDTO.getId();
        this.title = videoDTO.getTitle();
        this.description = videoDTO.getDescription();
        this.category = videoDTO.getCategory();
        this.tags = videoDTO.getTags();
        this.releaseYear = videoDTO.getReleaseYear();
        this.language = videoDTO.getLanguage();
        this.thumbnails = videoDTO.getThumbnails();
        this.status = videoDTO.getStatus();
        this.createdAt = videoDTO.getCreatedAt();
        this.updatedAt = videoDTO.getUpdatedAt();
    }

    // Constructor from domain entity with additional URL information
    public VideoResponse(Video video, String baseUrl) {
        this.id = video.getId();
        this.title = video.getTitle();
        this.description = video.getDescription();
        
        if (video.getCategory() != null) {
            this.category = new CategoryDTO(video.getCategory());
        }
        
        this.tags = video.getTags();
        this.releaseYear = video.getReleaseYear();
        this.language = video.getLanguage();
        
        this.thumbnails = video.getThumbnails().stream()
            .map(ThumbnailDTO::new)
            .toList();
        
        this.status = video.getStatus();
        this.createdAt = video.getCreatedAt();
        this.updatedAt = video.getUpdatedAt();
        
        // Add HATEOAS-style links
        this.resourceUrl = baseUrl + "/api/v1/videos/" + this.id;
        
        // Add thumbnail URLs if available
        if (this.thumbnails != null && !this.thumbnails.isEmpty()) {
            this.thumbnailUrls = this.thumbnails.stream()
                .map(thumbnail -> baseUrl + "/api/v1/videos/" + this.id + "/thumbnails/" + thumbnail.getId())
                .toList();
        }
    }

    // Getters and setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public CategoryDTO getCategory() {
        return category;
    }

    public void setCategory(CategoryDTO category) {
        this.category = category;
    }

    public Set<String> getTags() {
        return tags;
    }

    public void setTags(Set<String> tags) {
        this.tags = tags;
    }

    public Integer getReleaseYear() {
        return releaseYear;
    }

    public void setReleaseYear(Integer releaseYear) {
        this.releaseYear = releaseYear;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public List<ThumbnailDTO> getThumbnails() {
        return thumbnails;
    }

    public void setThumbnails(List<ThumbnailDTO> thumbnails) {
        this.thumbnails = thumbnails;
    }

    public VideoStatus getStatus() {
        return status;
    }

    public void setStatus(VideoStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getResourceUrl() {
        return resourceUrl;
    }

    public void setResourceUrl(String resourceUrl) {
        this.resourceUrl = resourceUrl;
    }

    public List<String> getThumbnailUrls() {
        return thumbnailUrls;
    }

    public void setThumbnailUrls(List<String> thumbnailUrls) {
        this.thumbnailUrls = thumbnailUrls;
    }
}