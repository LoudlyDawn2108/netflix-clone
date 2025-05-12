package com.streamflix.video.presentation.mapper;

import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.presentation.dto.TenantResponse;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting between Tenant entity and DTOs
 */
@Component
public class TenantMapper {
    
    /**
     * Convert a Tenant entity to a TenantResponse DTO
     * @param tenant The tenant entity
     * @return TenantResponse DTO
     */
    public TenantResponse toResponse(Tenant tenant) {
        return new TenantResponse(
            tenant.getId(),
            tenant.getName(),
            tenant.getIdentifier(),
            tenant.getSubscriptionLevel().name(),
            tenant.getCreatedAt(),
            tenant.getUpdatedAt(),
            tenant.isActive()
        );
    }
}
