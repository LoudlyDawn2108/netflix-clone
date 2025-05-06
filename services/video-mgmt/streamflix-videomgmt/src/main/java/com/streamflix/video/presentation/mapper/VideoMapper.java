package com.streamflix.video.presentation.mapper;

import com.streamflix.video.domain.Category;
import com.streamflix.video.domain.Video;
import com.streamflix.video.presentation.dto.CreateVideoRequest;
import com.streamflix.video.presentation.dto.UpdateVideoRequest;
import com.streamflix.video.presentation.dto.VideoDTO;
import com.streamflix.video.presentation.dto.VideoResponse;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper for converting between Video domain entities and DTOs.
 */
@Component
public class VideoMapper {

    private final CategoryMapper categoryMapper;
    private final ThumbnailMapper thumbnailMapper;

    public VideoMapper(CategoryMapper categoryMapper, ThumbnailMapper thumbnailMapper) {
        this.categoryMapper = categoryMapper;
        this.thumbnailMapper = thumbnailMapper;
    }

    /**
     * Convert a domain entity to a DTO
     */
    public VideoDTO toDto(Video video) {
        if (video == null) {
            return null;
        }
        
        return new VideoDTO(video);
    }
    
    /**
     * Convert a domain entity to a response DTO with HATEOAS links
     */
    public VideoResponse toResponse(Video video, String baseUrl) {
        if (video == null) {
            return null;
        }
        
        return new VideoResponse(video, baseUrl);
    }
    
    /**
     * Convert a list of domain entities to DTOs
     */
    public List<VideoDTO> toDtoList(List<Video> videos) {
        if (videos == null) {
            return List.of();
        }
        
        return videos.stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Convert a Page of domain entities to DTOs
     */
    public Page<VideoDTO> toDtoPage(Page<Video> videos) {
        if (videos == null) {
            return Page.empty();
        }
        
        return videos.map(this::toDto);
    }
    
    /**
     * Convert a list of domain entities to response DTOs
     */
    public List<VideoResponse> toResponseList(List<Video> videos, String baseUrl) {
        if (videos == null) {
            return List.of();
        }
        
        return videos.stream()
            .map(video -> toResponse(video, baseUrl))
            .collect(Collectors.toList());
    }
    
    /**
     * Convert a Page of domain entities to response DTOs
     */
    public Page<VideoResponse> toResponsePage(Page<Video> videos, String baseUrl) {
        if (videos == null) {
            return Page.empty();
        }
        
        return videos.map(video -> toResponse(video, baseUrl));
    }
    
    /**
     * Update an existing Video entity with data from UpdateVideoRequest
     */
    public Video updateFromRequest(Video video, UpdateVideoRequest request, Category category) {
        if (video == null || request == null) {
            return video;
        }
        
        if (request.getTitle() != null) {
            video.setTitle(request.getTitle());
        }
        
        if (request.getDescription() != null) {
            video.setDescription(request.getDescription());
        }
        
        if (category != null) {
            video.setCategory(category);
        }
        
        if (request.getTags() != null) {
            video.setTags(request.getTags());
        }
        
        if (request.getReleaseYear() != null) {
            video.setReleaseYear(request.getReleaseYear());
        }
        
        if (request.getLanguage() != null) {
            video.setLanguage(request.getLanguage());
        }
        
        return video;
    }
}