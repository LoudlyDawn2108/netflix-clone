package com.streamflix.video.infrastructure.persistence.specification;

import com.streamflix.video.domain.Video;
import com.streamflix.video.domain.VideoStatus;
import com.streamflix.video.presentation.dto.VideoFilterParams;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * JPA Specification for dynamic video query creation.
 * This class enables flexible filtering of videos based on various criteria.
 */
public class VideoSpecification {

    /**
     * Create a specification for filtering videos based on provided parameters
     *
     * @param params The filter parameters
     * @return A JPA Specification for the Video entity
     */
    public static Specification<Video> byFilterParams(VideoFilterParams params) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Title filter (case-insensitive contains)
            if (StringUtils.hasText(params.getTitle())) {
                predicates.add(criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("title")), 
                    "%" + params.getTitle().toLowerCase() + "%"
                ));
            }

            // Category filter
            if (params.getCategoryId() != null) {
                predicates.add(criteriaBuilder.equal(
                    root.get("category").get("id"),
                    params.getCategoryId()
                ));
            }

            // Year filter (exact match)
            if (params.getYear() != null) {
                predicates.add(criteriaBuilder.equal(
                    root.get("releaseYear"),
                    params.getYear()
                ));
            }
            
            // Min year filter
            if (params.getMinYear() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                    root.get("releaseYear"),
                    params.getMinYear()
                ));
            }
            
            // Max year filter
            if (params.getMaxYear() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                    root.get("releaseYear"),
                    params.getMaxYear()
                ));
            }

            // Language filter
            if (StringUtils.hasText(params.getLanguage())) {
                predicates.add(criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("language")),
                    params.getLanguage().toLowerCase()
                ));
            }

            // Status filter
            if (params.getStatus() != null) {
                predicates.add(criteriaBuilder.equal(
                    root.get("status"),
                    params.getStatus()
                ));
            }

            // Tags filter (checks if video has ANY of the specified tags)
            if (!CollectionUtils.isEmpty(params.getTags())) {
                Subquery<String> tagSubquery = query.subquery(String.class);
                Root<Video> tagRoot = tagSubquery.from(Video.class);
                Join<Video, String> tagJoin = tagRoot.join("tags");
                
                tagSubquery.select(tagJoin)
                    .where(
                        criteriaBuilder.equal(tagRoot.get("id"), root.get("id")),
                        tagJoin.in(params.getTags())
                    );
                
                predicates.add(criteriaBuilder.exists(tagSubquery));
            }

            // Combine all predicates with AND
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
    
    /**
     * Create a specification to filter videos by tag
     *
     * @param tag The tag to filter by
     * @return A JPA Specification for the Video entity
     */
    public static Specification<Video> byTag(String tag) {
        return (root, query, criteriaBuilder) -> {
            Subquery<String> tagSubquery = query.subquery(String.class);
            Root<Video> tagRoot = tagSubquery.from(Video.class);
            Join<Video, String> tagJoin = tagRoot.join("tags");
            
            tagSubquery.select(tagJoin)
                .where(
                    criteriaBuilder.equal(tagRoot.get("id"), root.get("id")),
                    criteriaBuilder.equal(tagJoin, tag)
                );
            
            return criteriaBuilder.exists(tagSubquery);
        };
    }
    
    /**
     * Create a specification to filter videos by category ID
     *
     * @param categoryId The category ID
     * @return A JPA Specification for the Video entity
     */
    public static Specification<Video> byCategory(UUID categoryId) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("category").get("id"), categoryId);
    }
    
    /**
     * Create a specification to exclude deleted videos
     *
     * @return A JPA Specification for the Video entity
     */
    public static Specification<Video> notDeleted() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.notEqual(root.get("status"), VideoStatus.DELETED);
    }
}