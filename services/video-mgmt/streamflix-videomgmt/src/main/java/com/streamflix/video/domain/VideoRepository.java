package com.streamflix.video.domain;

import com.streamflix.video.presentation.dto.VideoFilterParams;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Video entity operations.
 * This is a port in the hexagonal architecture that will be implemented
 * by adapters in the infrastructure layer.
 */
public interface VideoRepository {
    
    /**
     * Save a video entity to the repository
     * @param video The video to save
     * @return The saved video with any generated ids/fields
     */
    Video save(Video video);
    
    /**
     * Find a video by its unique identifier
     * @param id The video id
     * @return Optional containing the video if found
     */
    Optional<Video> findById(UUID id);
    
    /**
     * Find all videos with pagination
     * @param page The page number (0-based)
     * @param size The page size
     * @return List of videos for the requested page
     */
    List<Video> findAll(int page, int size);
    
    /**
     * Find videos by category
     * @param categoryId The category id
     * @param page The page number (0-based)
     * @param size The page size
     * @return List of videos for the given category
     */
    List<Video> findByCategory(UUID categoryId, int page, int size);
    
    /**
     * Find videos by tag
     * @param tag The tag to search for
     * @param page The page number (0-based)
     * @param size The page size
     * @return List of videos with the given tag
     */
    List<Video> findByTag(String tag, int page, int size);
    
    /**
     * Find videos by filter parameters with pagination and sorting
     * @param filterParams The filter parameters
     * @param page The page number (0-based)
     * @param size The page size
     * @return Page of videos matching the filter criteria
     */
    Page<Video> findByFilterParams(VideoFilterParams filterParams, int page, int size);
    
    /**
     * Delete a video from the repository
     * @param videoId The id of the video to delete
     */
    void deleteById(UUID videoId);
    
    /**
     * Count total number of videos
     * @return Total number of videos
     */
    long count();
    
    /**
     * Count videos by category
     * @param categoryId The category id
     * @return Number of videos in the category
     */
    long countByCategory(UUID categoryId);
    
    /**
     * Count videos by tag
     * @param tag The tag to count
     * @return Number of videos with the tag
     */
    long countByTag(String tag);
    
    /**
     * Count videos matching the filter parameters
     * @param filterParams The filter parameters
     * @return Number of videos matching the filter criteria
     */
    long countByFilterParams(VideoFilterParams filterParams);
}