package com.streamflix.video.presentation.dto;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Data Transfer Object for Video entities.
 */
@Schema(description = "Video metadata representation")
public class VideoDTO {
    @Schema(description = "Unique identifier of the video", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID id;
    
    @Schema(description = "Title of the video", example = "Inception")
    private String title;
    
    @Schema(description = "Detailed description of the video content", example = "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.")
    private String description;
    
    @Schema(description = "Category the video belongs to")
    private CategoryDTO category;
    
    @Schema(description = "List of tags to categorize the video", example = "[\"sci-fi\", \"action\", \"thriller\"]")
    private Set<String> tags;
    
    @Schema(description = "Year when the video was released", example = "2010")
    private Integer releaseYear;
    
    @Schema(description = "Language code of the video (ISO 639-1)", example = "en")
    private String language;
    
    @Schema(description = "List of thumbnails associated with the video")
    private List<ThumbnailDTO> thumbnails;
    
    @Schema(description = "Current processing status of the video", example = "READY", 
            allowableValues = {"PENDING", "UPLOADED", "PROCESSING", "READY", "FAILED", "DELETED"})
    private VideoStatus status;
    
    @Schema(description = "Timestamp when the video was created", example = "2025-05-12T10:30:00")
    private LocalDateTime createdAt;
    
    @Schema(description = "Timestamp when the video was last updated", example = "2025-05-12T15:45:00")
    private LocalDateTime updatedAt;

    // Default constructor
    public VideoDTO() {}

    // Constructor to convert domain entity to DTO
    public VideoDTO(Video video) {
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
            .collect(Collectors.toList());
        
        this.status = video.getStatus();
        this.createdAt = video.getCreatedAt();
        this.updatedAt = video.getUpdatedAt();
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
}