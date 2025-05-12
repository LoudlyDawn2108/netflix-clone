package com.streamflix.video.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * DTO for updating an existing video.
 */
@Schema(description = "Request object for updating an existing video")
public class UpdateVideoRequest {
    @Schema(description = "New title for the video (optional)", example = "Inception: Director's Cut")
    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;
    
    @Schema(description = "New description for the video (optional)", example = "The director's cut version with additional scenes and commentary")
    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;
    
    @Schema(description = "New category ID for the video (optional)", example = "f67e6d3e-9a0c-4e95-b552-d6842e80c986")
    private UUID categoryId;
    
    @Schema(description = "New set of tags for the video (optional)", example = "[\"sci-fi\", \"action\", \"thriller\", \"mind-bending\"]")
    private Set<String> tags;
    
    @Schema(description = "New release year for the video (optional)", example = "2010")
    private Integer releaseYear;
    
    @Schema(description = "New language code for the video (optional)", example = "en-US")
    @Size(max = 10, message = "Language code cannot exceed 10 characters")
    private String language;
    
    // Getters and setters
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
    
    public UUID getCategoryId() {
        return categoryId;
    }
    
    public void setCategoryId(UUID categoryId) {
        this.categoryId = categoryId;
    }
    
    public Set<String> getTags() {
        return tags;
    }
    
    public void setTags(Set<String> tags) {
        this.tags = tags != null ? tags : new HashSet<>();
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
}