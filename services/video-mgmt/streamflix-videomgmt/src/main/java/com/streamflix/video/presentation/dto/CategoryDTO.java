package com.streamflix.video.presentation.dto;

import com.streamflix.video.domain.Category;

import java.util.UUID;

/**
 * Data Transfer Object for Category entities.
 */
public class CategoryDTO {
    private UUID id;
    private String name;
    private String description;

    // Default constructor
    public CategoryDTO() {}

    // Constructor to convert domain entity to DTO
    public CategoryDTO(Category category) {
        this.id = category.getId();
        this.name = category.getName();
        this.description = category.getDescription();
    }

    // Getters and setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}