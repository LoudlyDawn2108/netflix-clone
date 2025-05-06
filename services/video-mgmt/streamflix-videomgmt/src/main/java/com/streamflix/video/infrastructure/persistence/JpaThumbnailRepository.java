package com.streamflix.video.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.streamflix.video.domain.Thumbnail;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Thumbnail entities.
 */
@Repository
public interface JpaThumbnailRepository extends JpaRepository<Thumbnail, UUID> {
    /**
     * Find all thumbnails for a specific video.
     *
     * @param videoId the ID of the video
     * @return a list of thumbnails for the video
     */
    List<Thumbnail> findByVideoId(UUID videoId);
    
    /**
     * Find the default thumbnail for a specific video.
     *
     * @param videoId the ID of the video
     * @return an Optional containing the default thumbnail if found, or an empty Optional if not
     */
    Optional<Thumbnail> findByVideoIdAndIsDefaultTrue(UUID videoId);
    
    /**
     * Delete all thumbnails associated with a video.
     *
     * @param videoId the ID of the video
     */
    void deleteByVideoId(UUID videoId);
    
    /**
     * Count thumbnails for a specific video.
     *
     * @param videoId the ID of the video
     * @return the number of thumbnails associated with the video
     */
    long countByVideoId(UUID videoId);
}