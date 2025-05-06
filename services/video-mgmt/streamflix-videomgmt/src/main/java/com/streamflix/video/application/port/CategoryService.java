package com.streamflix.video.application.port;

import com.streamflix.video.domain.Category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service interface for category management operations.
 * This is part of the application layer in the hexagonal architecture.
 */
public interface CategoryService {

    /**
     * Create a new category
     * @param name The category name
     * @param description The category description
     * @return The created category entity
     */
    Category createCategory(String name, String description);

    /**
     * Retrieve a category by its ID
     * @param id The category ID
     * @return Optional containing the category if found
     */
    Optional<Category> getCategory(UUID id);

    /**
     * Update an existing category
     * @param id The category ID
     * @param name The new name (optional, null to leave unchanged)
     * @param description The new description (optional, null to leave unchanged)
     * @return The updated category entity or empty if not found
     */
    Optional<Category> updateCategory(UUID id, String name, String description);

    /**
     * Delete a category by its ID
     * @param id The category ID
     * @return true if the category was deleted, false if not found
     */
    boolean deleteCategory(UUID id);

    /**
     * List all categories
     * @return List of all categories
     */
    List<Category> listAllCategories();

    /**
     * List categories with pagination
     * @param page The page number (0-based)
     * @param size The page size
     * @return List of categories for the requested page
     */
    List<Category> listCategories(int page, int size);
}