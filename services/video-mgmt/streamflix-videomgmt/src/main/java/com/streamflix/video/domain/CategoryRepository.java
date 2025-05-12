package com.streamflix.video.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Category entity operations.
 * This is a port in the hexagonal architecture that will be implemented
 * by adapters in the infrastructure layer.
 */
public interface CategoryRepository {
    
    /**
     * Save a category entity to the repository
     * @param category The category to save
     * @return The saved category with any generated ids/fields
     */
    Category save(Category category);
    
    /**
     * Find a category by its unique identifier
     * @param id The category id
     * @return Optional containing the category if found
     */
    Optional<Category> findById(UUID id);
    
    /**
     * Find a category by its name
     * @param name The category name
     * @return Optional containing the category if found
     */
    Optional<Category> findByName(String name);
    
    /**
     * Find all categories
     * @return List of all categories
     */
    List<Category> findAll();
    
    /**
     * Find all categories with pagination
     * @param page The page number (0-based)
     * @param size The page size
     * @return List of categories for the requested page
     */
    List<Category> findAll(int page, int size);
    
    /**
     * Delete a category from the repository
     * @param categoryId The id of the category to delete
     */
    void deleteById(UUID categoryId);
    
    /**
     * Check if a category exists
     * @param id The category id
     * @return true if the category exists
     */
    boolean existsById(UUID id);
}