package com.streamflix.video.infrastructure.persistence;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.infrastructure.persistence.specification.VideoSpecification;
import com.streamflix.video.presentation.dto.VideoFilterParams;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adapter implementation of the VideoRepository domain interface.
 * This connects the domain layer to the Spring Data JPA infrastructure.
 */
@Component
public class VideoRepositoryAdapter implements VideoRepository {

    private final JpaVideoRepository jpaRepository;

    public VideoRepositoryAdapter(JpaVideoRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Video save(Video video) {
        return jpaRepository.save(video);
    }

    @Override
    public Optional<Video> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Video> findAll(int page, int size) {
        return jpaRepository.findAll(PageRequest.of(page, size)).getContent();
    }

    @Override
    public List<Video> findByCategory(UUID categoryId, int page, int size) {
        return jpaRepository.findByCategoryId(categoryId, PageRequest.of(page, size));
    }

    @Override
    public List<Video> findByTag(String tag, int page, int size) {
        return jpaRepository.findByTag(tag, PageRequest.of(page, size));
    }

    @Override
    public Page<Video> findByFilterParams(VideoFilterParams filterParams, int page, int size) {
        Pageable pageable = createPageableFromParams(filterParams, page, size);
        
        // Create a specification from the filter parameters and include not deleted videos
        Specification<Video> spec = Specification
            .where(VideoSpecification.byFilterParams(filterParams))
            .and(VideoSpecification.notDeleted());
            
        return jpaRepository.findAll(spec, pageable);
    }

    @Override
    public void deleteById(UUID videoId) {
        jpaRepository.deleteById(videoId);
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

    @Override
    public long countByCategory(UUID categoryId) {
        return jpaRepository.countByCategoryId(categoryId);
    }

    @Override
    public long countByTag(String tag) {
        return jpaRepository.countByTag(tag);
    }

    @Override
    public long countByFilterParams(VideoFilterParams filterParams) {
        Specification<Video> spec = Specification
            .where(VideoSpecification.byFilterParams(filterParams))
            .and(VideoSpecification.notDeleted());
            
        return jpaRepository.count(spec);
    }
    
    @Override
    public Optional<Video> findByThumbnailId(UUID thumbnailId) {
        return jpaRepository.findByThumbnailId(thumbnailId);
    }
    
    /**
     * Create a Pageable object from filter parameters
     * 
     * @param filterParams The filter parameters including sort info
     * @param page The page number (0-based)
     * @param size The page size
     * @return A configured Pageable object
     */
    private Pageable createPageableFromParams(VideoFilterParams filterParams, int page, int size) {
        Sort sort = Sort.by(Sort.Direction.DESC, "updatedAt"); // default sort
        
        if (filterParams.getSortBy() != null) {
            Sort.Direction direction = Sort.Direction.ASC;
            
            if (filterParams.getSortDirection() != null && 
                filterParams.getSortDirection().equalsIgnoreCase("desc")) {
                direction = Sort.Direction.DESC;
            }
            
            // Validate sort field to prevent injection
            String sortField = getSafeFieldName(filterParams.getSortBy());
            sort = Sort.by(direction, sortField);
        }
        
        return PageRequest.of(page, size, sort);
    }
    
    /**
     * Sanitize field name for sorting to prevent SQL injection
     * 
     * @param fieldName The requested field name
     * @return A safe field name
     */
    private String getSafeFieldName(String fieldName) {
        // Map of allowed sort fields to their JPA entity property names
        return switch (fieldName.toLowerCase()) {
            case "title" -> "title";
            case "releaseyear", "year", "release_year" -> "releaseYear";
            case "language" -> "language";
            case "createdat", "created_at", "created" -> "createdAt";
            case "updatedat", "updated_at", "updated" -> "updatedAt";
            default -> "updatedAt"; // Default sort field
        };
    }
}