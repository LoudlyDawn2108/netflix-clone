package com.streamflix.video.presentation;

import com.streamflix.video.application.port.VideoService;
import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.presentation.dto.*;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * REST controller for video management operations.
 */
@RestController
@RequestMapping("/api/v1/videos")
@Tag(name = "Video Management", description = "API endpoints for managing video metadata")
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
    @WithSpan
    @PreAuthorize("@security.isContentManager() or @security.isAdmin()")    @Operation(
        summary = "Create a new video",
        description = "Creates a new video metadata entry with pending status. Requires ADMIN or CONTENT_MANAGER role.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Video metadata to create",
            required = true,
            content = @Content(mediaType = "application/json", 
                schema = @Schema(implementation = CreateVideoRequest.class),
                example = """
                {
                  "title": "Inception",
                  "description": "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.",
                  "categoryId": "f67e6d3e-9a0c-4e95-b552-d6842e80c986",
                  "tags": ["sci-fi", "thriller", "action", "mind-bending"],
                  "releaseYear": 2010,
                  "language": "en"
                }
                """
            )
        )
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Video created successfully", 
            content = @Content(mediaType = "application/json", 
                schema = @Schema(implementation = VideoDTO.class),
                example = """
                {
                  "id": "550e8400-e29b-41d4-a716-446655440000",
                  "title": "Inception",
                  "description": "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.",
                  "category": {
                    "id": "f67e6d3e-9a0c-4e95-b552-d6842e80c986",
                    "name": "Sci-Fi",
                    "description": "Science fiction films"
                  },
                  "tags": ["sci-fi", "thriller", "action", "mind-bending"],
                  "releaseYear": 2010,
                  "language": "en",
                  "thumbnails": [],
                  "status": "PENDING",
                  "createdAt": "2025-05-12T10:30:00",
                  "updatedAt": "2025-05-12T10:30:00"
                }
                """
            )),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN or CONTENT_MANAGER role")
    })
    public ResponseEntity<VideoDTO> createVideo(@Valid @RequestBody CreateVideoRequest request) {
        logger.info("API request to create new video: {}", request.getTitle());
        Span.current().setAttribute("http.method", "POST");
        Span.current().setAttribute("http.route", "/api/v1/videos");
        Span.current().setAttribute("video.title", request.getTitle());
        Span.current().setAttribute("video.tags.count", request.getTags() != null ? request.getTags().size() : 0);

        CompletableFuture<Video> createdVideoFuture = videoService.createVideo(
            request.getTitle(),
            request.getDescription(),
            request.getCategoryId(),
            request.getTags()
        );

        CompletableFuture<VideoDTO> responseFuture = createdVideoFuture.thenCompose(createdVideo -> {
            if (request.getReleaseYear() != null || request.getLanguage() != null) {
                return videoService.updateVideo(
                    createdVideo.getId(),
                    null, // title not updated here
                    null, // description not updated here
                    null, // categoryId not updated here
                    request.getReleaseYear(),
                    request.getLanguage()
                ).thenApply(updatedVideoOpt -> new VideoDTO(updatedVideoOpt.orElse(createdVideo)));
            } else {
                return CompletableFuture.completedFuture(new VideoDTO(createdVideo));
            }
        });
        
        try {
            return new ResponseEntity<>(responseFuture.get(), HttpStatus.CREATED); // Blocking call, consider reactive approach for full async
        } catch (Exception e) {
            logger.error("Error creating video asynchronously", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }    /**
     * Retrieve a video by ID - accessible to all authenticated users
     */
    @GetMapping("/{id}")
    @WithSpan
    @PreAuthorize("isAuthenticated()")    @Operation(
        summary = "Get video by ID",
        description = "Retrieves detailed video metadata by its ID. Accessible to all authenticated users."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successful operation",
            content = @Content(mediaType = "application/json", 
                schema = @Schema(implementation = VideoDTO.class),
                example = """
                {
                  "id": "550e8400-e29b-41d4-a716-446655440000",
                  "title": "Inception",
                  "description": "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.",
                  "category": {
                    "id": "f67e6d3e-9a0c-4e95-b552-d6842e80c986",
                    "name": "Sci-Fi",
                    "description": "Science fiction films"
                  },
                  "tags": ["sci-fi", "thriller", "action", "mind-bending"],
                  "releaseYear": 2010,
                  "language": "en",
                  "thumbnails": [
                    {
                      "id": "a15e6d3e-9a0c-4e95-b552-d6842e80c986",
                      "url": "https://storage.streamflix.com/thumbnails/inception/cover.jpg",
                      "width": 640,
                      "height": 360,
                      "default": true
                    }
                  ],
                  "status": "READY",
                  "createdAt": "2025-05-01T10:30:00",
                  "updatedAt": "2025-05-02T15:45:00"
                }
                """
            )),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Video not found")
    })
    @Operation(
        summary = "Get video by ID",
        description = "Retrieves video metadata by ID. Accessible to all authenticated users."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successful operation",
            content = @Content(schema = @Schema(implementation = VideoDTO.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Video not found")
    })
    public ResponseEntity<VideoDTO> getVideo(
            @Parameter(description = "ID of the video to retrieve") 
            @PathVariable UUID id) {
        logger.info("API request to get video with id: {}", id);
        Span.current().setAttribute("http.method", "GET");
        Span.current().setAttribute("http.route", "/api/v1/videos/{id}");
        Span.current().setAttribute("video.id", id.toString());
        
        CompletableFuture<VideoDTO> responseFuture = videoService.getVideo(id)
            .thenApply(videoOpt -> videoOpt.map(VideoDTO::new)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found")));

        try {
            return new ResponseEntity<>(responseFuture.get(), HttpStatus.OK); // Blocking call
        } catch (Exception e) {
            logger.error("Error getting video asynchronously", e);
            if (e.getCause() instanceof ResponseStatusException rse) {
                throw rse;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }
      /**
     * Update video metadata - requires ADMIN or CONTENT_MANAGER role
     */
    @PutMapping("/{id}")
    @WithSpan
    @PreAuthorize("@security.isContentManager() or @security.isAdmin()")
    @Operation(
        summary = "Update video metadata",
        description = "Updates existing video metadata. Requires ADMIN or CONTENT_MANAGER role."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Video updated successfully",
            content = @Content(schema = @Schema(implementation = VideoDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN or CONTENT_MANAGER role"),
        @ApiResponse(responseCode = "404", description = "Video not found")
    })
    public ResponseEntity<VideoDTO> updateVideo(
            @PathVariable UUID id,
            @Valid @RequestBody CreateVideoRequest request) {
        
        logger.info("API request to update video with id: {}", id);
        Span.current().setAttribute("http.method", "PUT");
        Span.current().setAttribute("http.route", "/api/v1/videos/{id}");
        Span.current().setAttribute("video.id", id.toString());
        Span.current().setAttribute("video.new.title", request.getTitle());
        Span.current().setAttribute("video.tags.count", request.getTags() != null ? request.getTags().size() : 0);
        
        CompletableFuture<Video> updateVideoFuture = videoService.updateVideo(
                id,
                request.getTitle(),
                request.getDescription(),
                request.getCategoryId(),
                request.getReleaseYear(),
                request.getLanguage()
            )
            .thenCompose(videoOpt -> videoOpt.map(CompletableFuture::completedFuture)
                .orElse(CompletableFuture.failedFuture(new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"))));

        CompletableFuture<VideoDTO> responseFuture = updateVideoFuture.thenCompose(updatedVideo -> {
            if (request.getTags() != null) {
                return videoService.updateVideoTags(id, request.getTags())
                    .thenCompose(tagsUpdatedVideoOpt -> tagsUpdatedVideoOpt.map(CompletableFuture::completedFuture)
                         .orElse(CompletableFuture.failedFuture(new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found for tag update"))))
                    .thenCompose(videoWithTags -> videoService.getVideo(id) // Re-fetch to get latest state
                        .thenApply(finalVideoOpt -> finalVideoOpt.map(VideoDTO::new)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found after tag update")))); 
            } else {
                return videoService.getVideo(id) // Re-fetch to get latest state if no tags updated
                        .thenApply(finalVideoOpt -> finalVideoOpt.map(VideoDTO::new)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found")));
            }
        });

        try {
            return new ResponseEntity<>(responseFuture.get(), HttpStatus.OK); // Blocking call
        } catch (Exception e) {
            logger.error("Error updating video asynchronously", e);
            if (e.getCause() instanceof ResponseStatusException rse) {
                throw rse;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }
      /**
     * Delete a video - requires ADMIN role
     */
    @DeleteMapping("/{id}")
    @WithSpan
    @PreAuthorize("@security.isAdmin()")
    @Operation(
        summary = "Delete a video",
        description = "Deletes a video and its metadata. Requires ADMIN role."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Video deleted successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role"),
        @ApiResponse(responseCode = "404", description = "Video not found")
    })
    public ResponseEntity<Void> deleteVideo(@PathVariable UUID id) {
        logger.info("API request to delete video with id: {}", id);
        Span.current().setAttribute("http.method", "DELETE");
        Span.current().setAttribute("http.route", "/api/v1/videos/{id}");
        Span.current().setAttribute("video.id", id.toString());
        
        CompletableFuture<Boolean> deleteFuture = videoService.deleteVideo(id);
        
        try {
            if (deleteFuture.get()) { // Blocking call
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            } else {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found");
            }
        } catch (Exception e) {
            logger.error("Error deleting video asynchronously", e);
            if (e.getCause() instanceof ResponseStatusException rse) {
                throw rse;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }
      /**
     * Update video status - requires ADMIN or CONTENT_MANAGER role
     * Service accounts can also update status for automated processing
     */
    @PatchMapping("/{id}/status")
    @WithSpan
    @PreAuthorize("@security.isContentManager() or @security.isAdmin() or @security.isService()")
    @Operation(
        summary = "Update video status",
        description = "Updates the processing status of a video. Used by admins, content managers, and service accounts for automated processing."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Status updated successfully",
            content = @Content(schema = @Schema(implementation = VideoDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid status value"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires appropriate role"),
        @ApiResponse(responseCode = "404", description = "Video not found")
    })
    public ResponseEntity<VideoDTO> updateVideoStatus(
            @PathVariable UUID id,
            @RequestParam VideoStatus status) {
        
        logger.info("API request to update status of video with id: {} to {}", id, status);
        Span.current().setAttribute("http.method", "PATCH");
        Span.current().setAttribute("http.route", "/api/v1/videos/{id}/status");
        Span.current().setAttribute("video.id", id.toString());
        Span.current().setAttribute("video.new.status", status.name());
        
        CompletableFuture<VideoDTO> responseFuture = videoService.updateVideoStatus(id, status)
            .thenApply(videoOpt -> videoOpt.map(VideoDTO::new)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found")));

        try {
            return new ResponseEntity<>(responseFuture.get(), HttpStatus.OK); // Blocking call
        } catch (Exception e) {
            logger.error("Error updating video status asynchronously", e);
            if (e.getCause() instanceof ResponseStatusException rse) {
                throw rse;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }
      /**
     * List all videos with pagination - accessible to all authenticated users
     */
    @GetMapping
    @WithSpan
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "List videos with pagination",
        description = "Returns a paginated list of videos. Accessible to all authenticated users."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successful operation", 
            content = @Content(schema = @Schema(implementation = VideoDTO.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<List<VideoDTO>> listVideos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("API request to list videos, page: {}, size: {}", page, size);
        Span.current().setAttribute("http.method", "GET");
        Span.current().setAttribute("http.route", "/api/v1/videos");
        Span.current().setAttribute("list.page", page);
        Span.current().setAttribute("list.size", size);
        
        CompletableFuture<List<VideoDTO>> responseFuture = videoService.listVideos(page, size)
            .thenApply(videos -> videos.stream()
                .map(VideoDTO::new)
                .collect(Collectors.toList()));
        
        try {
            return new ResponseEntity<>(responseFuture.get(), HttpStatus.OK); // Blocking call
        } catch (Exception e) {
            logger.error("Error listing videos asynchronously", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }
      /**
     * Filter videos with various parameters - accessible to all authenticated users
     */
    @GetMapping("/filter")
    @WithSpan
    @PreAuthorize("isAuthenticated()")    @Operation(
        summary = "Filter videos",
        description = "Advanced filtering of videos with multiple criteria. Accessible to all authenticated users."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successful operation",
            content = @Content(mediaType = "application/json", 
                schema = @Schema(implementation = PageResponse.class),
                example = """
                {
                  "content": [
                    {
                      "id": "550e8400-e29b-41d4-a716-446655440000",
                      "title": "Inception",
                      "description": "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.",
                      "category": {
                        "id": "f67e6d3e-9a0c-4e95-b552-d6842e80c986",
                        "name": "Sci-Fi",
                        "description": "Science fiction films"
                      },
                      "tags": ["sci-fi", "thriller", "action"],
                      "releaseYear": 2010,
                      "language": "en",
                      "thumbnails": [
                        {
                          "id": "a15e6d3e-9a0c-4e95-b552-d6842e80c986",
                          "url": "https://storage.streamflix.com/thumbnails/inception/cover.jpg",
                          "width": 640,
                          "height": 360,
                          "default": true
                        }
                      ],
                      "status": "READY",
                      "createdAt": "2025-05-01T10:30:00",
                      "updatedAt": "2025-05-01T15:45:00"
                    },
                    {
                      "id": "660e8400-e29b-41d4-a716-446655440011",
                      "title": "The Matrix",
                      "description": "A computer hacker learns about the true nature of reality and his role in the war against its controllers.",
                      "category": {
                        "id": "f67e6d3e-9a0c-4e95-b552-d6842e80c986",
                        "name": "Sci-Fi",
                        "description": "Science fiction films"
                      },
                      "tags": ["sci-fi", "action", "cyberpunk"],
                      "releaseYear": 1999,
                      "language": "en",
                      "thumbnails": [
                        {
                          "id": "b25e6d3e-9a0c-4e95-b552-d6842e80c876",
                          "url": "https://storage.streamflix.com/thumbnails/matrix/cover.jpg",
                          "width": 640,
                          "height": 360,
                          "default": true
                        }
                      ],
                      "status": "READY",
                      "createdAt": "2025-04-15T09:20:00",
                      "updatedAt": "2025-04-15T14:30:00"
                    }
                  ],
                  "totalElements": 2,
                  "totalPages": 1,
                  "currentPage": 0,
                  "pageSize": 10,
                  "first": true,
                  "last": true,
                  "empty": false
                }
                """
            )),
        @ApiResponse(responseCode = "400", description = "Invalid filter parameters"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })public ResponseEntity<PageResponse<VideoDTO>> filterVideos(
            // Basic filters
            @Parameter(description = "Filter by video title (partial match)") 
            @RequestParam(required = false) String title,
            @Parameter(description = "Filter by category ID") 
            @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Filter by release year") 
            @RequestParam(required = false) Integer year,
            @Parameter(description = "Filter by language code (e.g., 'en', 'es')") 
            @RequestParam(required = false) String language,
            @Parameter(description = "Filter by one or more tags") 
            @RequestParam(required = false) List<String> tags,
            @Parameter(description = "Filter by processing status") 
            @RequestParam(required = false) VideoStatus status,
              // Range filters
            @Parameter(description = "Filter by minimum release year") 
            @RequestParam(required = false) Integer minYear,
            @Parameter(description = "Filter by maximum release year") 
            @RequestParam(required = false) Integer maxYear,
            
            // Sorting
            @Parameter(description = "Field to sort by (e.g., 'title', 'createdAt', 'updatedAt')") 
            @RequestParam(required = false, defaultValue = "updatedAt") String sortBy,
            @Parameter(description = "Sort direction ('asc' or 'desc')") 
            @RequestParam(required = false, defaultValue = "desc") String sortDirection,
            
            // Pagination
            @Parameter(description = "Page number (0-based)") 
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size (default: 10, max: 100)") 
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("API request to filter videos with params: title={}, categoryId={}, year={}, language={}, tags={}, status={}", 
                title, categoryId, year, language, tags, status);
        Span.current().setAttribute("filter.title", title != null ? title : "");
        Span.current().setAttribute("filter.category_id", categoryId != null ? categoryId.toString() : "");
        Span.current().setAttribute("filter.year", year != null ? year : -1);
        Span.current().setAttribute("filter.language", language != null ? language : "");
        Span.current().setAttribute("filter.tags.count", tags != null ? tags.size() : 0);
        Span.current().setAttribute("filter.status", status != null ? status.name() : "");
        
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
        
        CompletableFuture<PageResponse<VideoDTO>> responseFuture = videoService.findByFilterParams(filterParams, page, size)
            .thenApply(videoPage -> new PageResponse<>(videoPage.map(VideoDTO::new)));
        
        try {
            return new ResponseEntity<>(responseFuture.get(), HttpStatus.OK); // Blocking call
        } catch (Exception e) {
            logger.error("Error filtering videos asynchronously", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }
      /**
     * Find videos by category - accessible to all authenticated users
     */
    @GetMapping("/by-category/{categoryId}")
    @WithSpan
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "List videos by category",
        description = "Returns a paginated list of videos that belong to a specific category. Accessible to all authenticated users."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successful operation", 
            content = @Content(schema = @Schema(implementation = VideoDTO.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Category not found")
    })    public ResponseEntity<List<VideoDTO>> findVideosByCategory(
            @Parameter(description = "ID of the category to filter by") 
            @PathVariable UUID categoryId,
            @Parameter(description = "Page number (0-based)") 
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size (default: 10, max: 100)") 
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("API request to find videos by category id: {}", categoryId);
        Span.current().setAttribute("http.method", "GET");
        Span.current().setAttribute("http.route", "/api/v1/videos/by-category/{categoryId}");
        Span.current().setAttribute("filter.category_id", categoryId.toString());
        
        CompletableFuture<List<VideoDTO>> responseFuture = videoService.findVideosByCategory(categoryId, page, size)
            .thenApply(videos -> videos.stream()
                .map(VideoDTO::new)
                .collect(Collectors.toList()));
        
        try {
            return new ResponseEntity<>(responseFuture.get(), HttpStatus.OK); // Blocking call
        } catch (Exception e) {
            logger.error("Error finding videos by category asynchronously", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }
      /**
     * Find videos by tag - accessible to all authenticated users
     */
    @GetMapping("/by-tag/{tag}")
    @WithSpan
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "List videos by tag",
        description = "Returns a paginated list of videos that have a specific tag. Accessible to all authenticated users."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Successful operation", 
            content = @Content(schema = @Schema(implementation = VideoDTO.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })    public ResponseEntity<List<VideoDTO>> findVideosByTag(
            @Parameter(description = "Tag to filter by") 
            @PathVariable String tag,
            @Parameter(description = "Page number (0-based)") 
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size (default: 10, max: 100)") 
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("API request to find videos by tag: {}", tag);
        Span.current().setAttribute("http.method", "GET");
        Span.current().setAttribute("http.route", "/api/v1/videos/by-tag/{tag}");
        Span.current().setAttribute("filter.tag", tag);
        
        CompletableFuture<List<VideoDTO>> responseFuture = videoService.findVideosByTag(tag, page, size)
            .thenApply(videos -> videos.stream()
                .map(VideoDTO::new)
                .collect(Collectors.toList()));
        
        try {
            return new ResponseEntity<>(responseFuture.get(), HttpStatus.OK); // Blocking call
        } catch (Exception e) {
            logger.error("Error finding videos by tag asynchronously", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request");
        }
    }
}