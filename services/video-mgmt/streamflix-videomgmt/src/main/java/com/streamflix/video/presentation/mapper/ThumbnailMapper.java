package com.streamflix.video.presentation.mapper;

import com.streamflix.video.domain.Thumbnail;
import com.streamflix.video.presentation.dto.ThumbnailDTO;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper for converting between Thumbnail domain entities and DTOs.
 */
@Component
public class ThumbnailMapper {

    /**
     * Convert a domain entity to a DTO
     */
    public ThumbnailDTO toDto(Thumbnail thumbnail) {
        if (thumbnail == null) {
            return null;
        }
        
        return new ThumbnailDTO(thumbnail);
    }
    
    /**
     * Convert a list of domain entities to DTOs
     */
    public List<ThumbnailDTO> toDtoList(List<Thumbnail> thumbnails) {
        if (thumbnails == null) {
            return List.of();
        }
        
        return thumbnails.stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Convert a Page of domain entities to DTOs
     */
    public Page<ThumbnailDTO> toDtoPage(Page<Thumbnail> thumbnails) {
        if (thumbnails == null) {
            return Page.empty();
        }
        
        return thumbnails.map(this::toDto);
    }
}