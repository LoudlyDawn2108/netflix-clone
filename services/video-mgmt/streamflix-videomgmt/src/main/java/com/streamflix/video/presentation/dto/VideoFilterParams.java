package com.streamflix.video.presentation.dto;

import com.streamflix.video.domain.VideoStatus;

import java.util.List;
import java.util.UUID;

/**
 * Data Transfer Object for filtering videos with various parameters.
 * This class captures all possible filter parameters from API requests.
 */
public class VideoFilterParams {

    private String title;
    private UUID categoryId;
    private Integer year;
    private String language;
    private List<String> tags;
    private VideoStatus status;
    private Integer minYear;
    private Integer maxYear;
    private String sortBy;
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