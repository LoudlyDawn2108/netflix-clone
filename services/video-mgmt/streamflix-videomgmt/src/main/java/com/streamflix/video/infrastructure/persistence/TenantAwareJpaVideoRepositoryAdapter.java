package com.streamflix.video.infrastructure.persistence;

import com.streamflix.video.domain.VideoRepository;
import com.streamflix.video.domain.Video;
import com.streamflix.video.infrastructure.multitenancy.TenantContextHolder;
import com.streamflix.video.infrastructure.multitenancy.TenantSpecification;
import com.streamflix.video.presentation.dto.VideoFilterParams;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA implementation of the VideoRepository interface with tenant filtering.
 * This is an adapter in the hexagonal architecture.
 */
@Component
public class TenantAwareJpaVideoRepositoryAdapter implements VideoRepository {

    private final JpaVideoRepository jpaVideoRepository;
    
    public TenantAwareJpaVideoRepositoryAdapter(JpaVideoRepository jpaVideoRepository) {
        this.jpaVideoRepository = jpaVideoRepository;
    }

    @Override
    public Video save(Video video) {
        // Set tenant ID automatically if not already set
        if (video.getTenantId() == null) {
            video.setTenantId(TenantContextHolder.getTenantId());
        }
        return jpaVideoRepository.save(video);
    }

    @Override
    public Optional<Video> findById(UUID id) {
        Specification<Video> spec = TenantSpecification.<Video>fromCurrentTenant()
            .and((root, query, cb) -> cb.equal(root.get("id"), id));
        return jpaVideoRepository.findOne(spec);
    }

    @Override
    public List<Video> findAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return jpaVideoRepository.findAll(TenantSpecification.fromCurrentTenant(), pageable).getContent();
    }

    @Override
    public List<Video> findByCategory(UUID categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Specification<Video> spec = TenantSpecification.<Video>fromCurrentTenant()
            .and((root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId));
        return jpaVideoRepository.findAll(spec, pageable).getContent();
    }

    @Override
    public List<Video> findByTag(String tag, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        // Implementing tenant filtering for tags requires a custom approach
        // since tags are stored in a collection table
        UUID tenantId = TenantContextHolder.getTenantId();
        return jpaVideoRepository.findByTagAndTenantId(tag, tenantId, pageable);
    }

    @Override
    public void delete(Video video) {
        // Ensure we only delete videos from the current tenant
        if (video.getTenantId().equals(TenantContextHolder.getTenantId())) {
            jpaVideoRepository.delete(video);
        }
    }

    @Override
    public long count() {
        return jpaVideoRepository.count(TenantSpecification.fromCurrentTenant());
    }

    @Override
    public long countByCategory(UUID categoryId) {
        Specification<Video> spec = TenantSpecification.<Video>fromCurrentTenant()
            .and((root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId));
        return jpaVideoRepository.count(spec);
    }

    @Override
    public long countByTag(String tag) {
        // Implement tenant-aware tag counting
        UUID tenantId = TenantContextHolder.getTenantId();
        return jpaVideoRepository.countByTagAndTenantId(tag, tenantId);
    }

    @Override
    public List<Video> findByUserId(UUID userId) {
        Specification<Video> spec = TenantSpecification.<Video>fromCurrentTenant()
            .and((root, query, cb) -> cb.equal(root.get("userId"), userId));
        return jpaVideoRepository.findAll(spec);
    }

    // Implement other methods from VideoRepository with tenant filtering...
}
