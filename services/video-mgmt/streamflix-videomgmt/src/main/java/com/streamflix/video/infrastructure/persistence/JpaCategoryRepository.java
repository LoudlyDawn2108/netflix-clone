package com.streamflix.video.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.streamflix.video.domain.Category;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Category entities.
 */
@Repository
public interface JpaCategoryRepository extends JpaRepository<Category, UUID> {
    /**
     * Find a category by its name.
     *
     * @param name the category name to search for
     * @return an Optional containing the category if found, or an empty Optional if not
     */
    Optional<Category> findByName(String name);
    
    /**
     * Check if a category exists by its name.
     *
     * @param name the category name to check
     * @return true if a category with the given name exists, false otherwise
     */
    boolean existsByName(String name);
}