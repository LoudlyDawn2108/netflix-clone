package com.streamflix.video.presentation.dto;

import com.streamflix.video.domain.VideoStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

/**
 * Data Transfer Object for filtering videos with various parameters.
 * This class captures all possible filter parameters from API requests.
 */
@Schema(description = "Parameters for filtering and sorting videos")
public class VideoFilterParams {

    @Schema(description = "Filter by video title (partial match)", example = "Marvel")
    private String title;
    
    @Schema(description = "Filter by category ID", example = "f67e6d3e-9a0c-4e95-b552-d6842e80c986")
    private UUID categoryId;
    
    @Schema(description = "Filter by exact release year", example = "2023")
    private Integer year;
    
    @Schema(description = "Filter by language code", example = "en")
    private String language;
    
    @Schema(description = "Filter by one or more tags", example = "[\"action\", \"adventure\"]")
    private List<String> tags;
    
    @Schema(description = "Filter by processing status", example = "READY")
    private VideoStatus status;
    
    @Schema(description = "Filter by minimum release year", example = "2020")
    private Integer minYear;
    
    @Schema(description = "Filter by maximum release year", example = "2025")
    private Integer maxYear;
    
    @Schema(description = "Field to sort by", example = "releaseYear", allowableValues = {"title", "releaseYear", "createdAt", "updatedAt"})
    private String sortBy;
    
    @Schema(description = "Direction of sorting", example = "desc", allowableValues = {"asc", "desc"})
    private String sortDirection;

    // Default constructor
    public VideoFilterParams() {
    }

    // Getters and setters
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(UUID categoryId) {
        this.categoryId = categoryId;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public VideoStatus getStatus() {
        return status;
    }

    public void setStatus(VideoStatus status) {
        this.status = status;
    }

    public Integer getMinYear() {
        return minYear;
    }

    public void setMinYear(Integer minYear) {
        this.minYear = minYear;
    }

    public Integer getMaxYear() {
        return maxYear;
    }

    public void setMaxYear(Integer maxYear) {
        this.maxYear = maxYear;
    }

    public String getSortBy() {
        return sortBy;
    }

    public void setSortBy(String sortBy) {
        this.sortBy = sortBy;
    }

    public String getSortDirection() {
        return sortDirection;
    }

    public void setSortDirection(String sortDirection) {
        this.sortDirection = sortDirection;
    }

    @Override
    public String toString() {
        return "VideoFilterParams{" +
                "title='" + title + '\'' +
                ", categoryId=" + categoryId +
                ", year=" + year +
                ", language='" + language + '\'' +
                ", tags=" + tags +
                ", status=" + status +
                ", minYear=" + minYear +
                ", maxYear=" + maxYear +
                ", sortBy='" + sortBy + '\'' +
                ", sortDirection='" + sortDirection + '\'' +
                '}';
    }
}