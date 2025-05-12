package com.streamflix.video.presentation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * DTO for creating a new video.
 */
@Schema(description = "Request object for creating or updating a video")
public class CreateVideoRequest {
    @Schema(description = "Title of the video", example = "Inception", required = true)
    @NotBlank(message = "Title is required")
    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;
    
    @Schema(description = "Detailed description of the video content", example = "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.")
    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;
    
    @Schema(description = "Category ID the video belongs to", example = "f67e6d3e-9a0c-4e95-b552-d6842e80c986")
    private UUID categoryId;
    
    @Schema(description = "List of tags to categorize the video", example = "[\"sci-fi\", \"action\", \"thriller\"]")
    private Set<String> tags = new HashSet<>();
    
    @Schema(description = "Year when the video was released", example = "2010")
    private Integer releaseYear;
    
    @Schema(description = "Language code of the video (ISO 639-1)", example = "en")
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