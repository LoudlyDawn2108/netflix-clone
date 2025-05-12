package com.streamflix.video.presentation.dto;

import com.streamflix.video.domain.Thumbnail;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/**
 * Data Transfer Object for Thumbnail entities.
 */
@Schema(description = "Thumbnail image representation for a video")
public class ThumbnailDTO {
    @Schema(description = "Unique identifier of the thumbnail", example = "a15e6d3e-9a0c-4e95-b552-d6842e80c986")
    private UUID id;
    
    @Schema(description = "URL path to access the thumbnail image", example = "https://storage.streamflix.com/thumbnails/video123/cover.jpg")
    private String url;
    
    @Schema(description = "Width of the thumbnail in pixels", example = "640")
    private Integer width;
    
    @Schema(description = "Height of the thumbnail in pixels", example = "360")
    private Integer height;
    
    @Schema(description = "Whether this is the default thumbnail for the video", example = "true")
    private boolean isDefault;

    // Default constructor
    public ThumbnailDTO() {}

    // Constructor to convert domain entity to DTO
    public ThumbnailDTO(Thumbnail thumbnail) {
        this.id = thumbnail.getId();
        this.url = thumbnail.getUrl();
        this.width = thumbnail.getWidth();
        this.height = thumbnail.getHeight();
        this.isDefault = thumbnail.isDefault();
    }

    // Getters and setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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
}