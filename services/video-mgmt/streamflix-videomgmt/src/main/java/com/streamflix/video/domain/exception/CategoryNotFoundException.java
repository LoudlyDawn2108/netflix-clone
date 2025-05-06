package com.streamflix.video.domain.exception;

import java.util.UUID;

/**
 * Exception thrown when a requested category cannot be found.
 */
public class CategoryNotFoundException extends RuntimeException {

    private final UUID categoryId;

    public CategoryNotFoundException(UUID categoryId) {
        super("Category not found with id: " + categoryId);
        this.categoryId = categoryId;
    }

    public UUID getCategoryId() {
        return categoryId;
    }
}