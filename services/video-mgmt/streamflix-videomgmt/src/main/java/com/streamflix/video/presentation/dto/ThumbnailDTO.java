package com.streamflix.video.presentation.dto;

import com.streamflix.video.domain.Thumbnail;

import java.util.UUID;

/**
 * Data Transfer Object for Thumbnail entities.
 */
public class ThumbnailDTO {
    private UUID id;
    private String url;
    private Integer width;
    private Integer height;
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