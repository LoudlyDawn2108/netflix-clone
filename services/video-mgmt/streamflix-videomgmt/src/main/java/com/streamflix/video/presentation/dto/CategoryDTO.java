package com.streamflix.video.presentation.dto;

import com.streamflix.video.domain.Category;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/**
 * Data Transfer Object for Category entities.
 */
@Schema(description = "Content category representation")
public class CategoryDTO {
    @Schema(description = "Unique identifier of the category", example = "b45e6d3e-9a0c-4e95-b552-d6842e80c123")
    private UUID id;
    
    @Schema(description = "Name of the category", example = "Action")
    private String name;
    
    @Schema(description = "Description of the category", example = "Fast-paced and exciting films featuring physical feats and stunts")
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