package com.streamflix.video.presentation;

import com.streamflix.video.application.VideoService;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.presentation.dto.*;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for video management operations.
 */
@RestController
@RequestMapping("/api/v1/videos")
public class VideoController {

    private static final Logger logger = LoggerFactory.getLogger(VideoController.class);
    
    private final VideoService videoService;
    
    public VideoController(VideoService videoService) {
        this.videoService = videoService;
    }
    
    /**
     * Create a new video - requires ADMIN or CONTENT_MANAGER role
     */
    @PostMapping
    @PreAuthorize("@security.isContentManager() or @security.isAdmin()")
    public ResponseEntity<VideoDTO> createVideo(@Valid @RequestBody CreateVideoRequest request) {
        logger.info("API request to create new video: {}", request.getTitle());
        
        Video createdVideo = videoService.createVideo(
            request.getTitle(),
            request.getDescription(),
            request.getCategoryId(),
            request.getTags()
        );
        
        // If the request has additional metadata, update it
        if (request.getReleaseYear() != null || request.getLanguage() != null) {
            createdVideo = videoService.updateVideo(
                createdVideo.getId(),
                null,
                null,
                null,
                request.getReleaseYear(),
                request.getLanguage()
            ).orElse(createdVideo);
        }
        
        return new ResponseEntity<>(new VideoDTO(createdVideo), HttpStatus.CREATED);
    }
    
    /**
     * Retrieve a video by ID - accessible to all authenticated users
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<VideoDTO> getVideo(@PathVariable UUID id) {
        logger.info("API request to get video with id: {}", id);
        
        return videoService.getVideo(id)
            .map(video -> new ResponseEntity<>(new VideoDTO(video), HttpStatus.OK))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));
    }
    
    /**
     * Update video metadata - requires ADMIN or CONTENT_MANAGER role
     */
    @PutMapping("/{id}")
    @PreAuthorize("@security.isContentManager() or @security.isAdmin()")
    public ResponseEntity<VideoDTO> updateVideo(
            @PathVariable UUID id,
            @Valid @RequestBody CreateVideoRequest request) {
        
        logger.info("API request to update video with id: {}", id);
        
        return videoService.updateVideo(
                id,
                request.getTitle(),
                request.getDescription(),
                request.getCategoryId(),
                request.getReleaseYear(),
                request.getLanguage()
            )
            .map(video -> {
                // Update tags if provided in the request
                if (request.getTags() != null) {
                    videoService.updateVideoTags(id, request.getTags());
                }
                
                // Get the latest version of the video
                return videoService.getVideo(id).orElseThrow();
            })
            .map(video -> new ResponseEntity<>(new VideoDTO(video), HttpStatus.OK))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));
    }
    
    /**
     * Delete a video - requires ADMIN role
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("@security.isAdmin()")
    public ResponseEntity<Void> deleteVideo(@PathVariable UUID id) {
        logger.info("API request to delete video with id: {}", id);
        
        boolean deleted = videoService.deleteVideo(id);
        
        if (deleted) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } else {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found");
        }
    }
    
    /**
     * Update video status - requires ADMIN or CONTENT_MANAGER role
     * Service accounts can also update status for automated processing
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("@security.isContentManager() or @security.isAdmin() or @security.isService()")
    public ResponseEntity<VideoDTO> updateVideoStatus(
            @PathVariable UUID id,
            @RequestParam VideoStatus status) {
        
        logger.info("API request to update status of video with id: {} to {}", id, status);
        
        return videoService.updateVideoStatus(id, status)
            .map(video -> new ResponseEntity<>(new VideoDTO(video), HttpStatus.OK))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));
    }
    
    /**
     * List all videos with pagination - accessible to all authenticated users
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<VideoDTO>> listVideos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("API request to list videos, page: {}, size: {}", page, size);
        
        List<VideoDTO> videos = videoService.listVideos(page, size)
            .stream()
            .map(VideoDTO::new)
            .collect(Collectors.toList());
        
        return new ResponseEntity<>(videos, HttpStatus.OK);
    }
    
    /**
     * Filter videos with various parameters - accessible to all authenticated users
     */
    @GetMapping("/filter")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PageResponse<VideoDTO>> filterVideos(
            // Basic filters
            @RequestParam(required = false) String title,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) VideoStatus status,
            
            // Range filters
            @RequestParam(required = false) Integer minYear,
            @RequestParam(required = false) Integer maxYear,
            
            // Sorting
            @RequestParam(required = false, defaultValue = "updatedAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortDirection,
            
            // Pagination
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("API request to filter videos with params: title={}, categoryId={}, year={}, language={}, tags={}, status={}", 
                title, categoryId, year, language, tags, status);
        
        // Create filter params object from request parameters
        VideoFilterParams filterParams = new VideoFilterParams();
        filterParams.setTitle(title);
        filterParams.setCategoryId(categoryId);
        filterParams.setYear(year);
        filterParams.setLanguage(language);
        filterParams.setTags(tags);
        filterParams.setStatus(status);
        filterParams.setMinYear(minYear);
        filterParams.setMaxYear(maxYear);
        filterParams.setSortBy(sortBy);
        filterParams.setSortDirection(sortDirection);
        
        // Get paginated results
        Page<Video> videoPage = videoService.findByFilterParams(filterParams, page, size);
        
        // Convert to DTOs
        Page<VideoDTO> videoDTOPage = videoPage.map(VideoDTO::new);
        
        // Create page response using existing constructor
        PageResponse<VideoDTO> response = new PageResponse<>(videoDTOPage);
        
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
    
    /**
     * Find videos by category - accessible to all authenticated users
     */
    @GetMapping("/by-category/{categoryId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<VideoDTO>> findVideosByCategory(
            @PathVariable UUID categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("API request to find videos by category id: {}", categoryId);
        
        List<VideoDTO> videos = videoService.findVideosByCategory(categoryId, page, size)
            .stream()
            .map(VideoDTO::new)
            .collect(Collectors.toList());
        
        return new ResponseEntity<>(videos, HttpStatus.OK);
    }
    
    /**
     * Find videos by tag - accessible to all authenticated users
     */
    @GetMapping("/by-tag/{tag}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<VideoDTO>> findVideosByTag(
            @PathVariable String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("API request to find videos by tag: {}", tag);
        
        List<VideoDTO> videos = videoService.findVideosByTag(tag, page, size)
            .stream()
            .map(VideoDTO::new)
            .collect(Collectors.toList());
        
        return new ResponseEntity<>(videos, HttpStatus.OK);
    }
}