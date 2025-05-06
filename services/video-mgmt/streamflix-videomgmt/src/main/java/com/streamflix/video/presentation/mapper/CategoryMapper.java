package com.streamflix.video.presentation.mapper;

import com.streamflix.video.domain.Category;
import com.streamflix.video.presentation.dto.CategoryDTO;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper for converting between Category domain entities and DTOs.
 */
@Component
public class CategoryMapper {

    /**
     * Convert a domain entity to a DTO
     */
    public CategoryDTO toDto(Category category) {
        if (category == null) {
            return null;
        }
        
        return new CategoryDTO(category);
    }
    
    /**
     * Convert a list of domain entities to DTOs
     */
    public List<CategoryDTO> toDtoList(List<Category> categories) {
        if (categories == null) {
            return List.of();
        }
        
        return categories.stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }
    
    /**
     * Convert a Page of domain entities to DTOs
     */
    public Page<CategoryDTO> toDtoPage(Page<Category> categories) {
        if (categories == null) {
            return Page.empty();
        }
        
        return categories.map(this::toDto);
    }
}