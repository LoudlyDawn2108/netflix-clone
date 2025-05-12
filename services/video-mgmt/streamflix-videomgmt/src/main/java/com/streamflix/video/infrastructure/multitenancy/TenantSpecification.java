package com.streamflix.video.infrastructure.multitenancy;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

/**
 * JPA Specification that adds a tenant filter to database queries.
 * @param <T> The entity type
 */
public class TenantSpecification<T> implements Specification<T> {
    
    private final UUID tenantId;
    
    public TenantSpecification(UUID tenantId) {
        this.tenantId = tenantId;
    }
    
    @Override
    public Predicate toPredicate(Root<T> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return criteriaBuilder.equal(root.get("tenantId"), tenantId);
    }
    
    /**
     * Create a new TenantSpecification using the tenant from the current context
     * @param <T> The entity type
     * @return A new TenantSpecification
     */
    public static <T> TenantSpecification<T> fromCurrentTenant() {
        return new TenantSpecification<>(TenantContextHolder.getTenantId());
    }
    
    /**
     * Combine the tenant specification with another specification using AND
     * @param otherSpec The other specification
     * @param <T> The entity type
     * @return A combined specification
     */
    public static <T> Specification<T> andWithTenant(Specification<T> otherSpec) {
        Specification<T> tenantSpec = fromCurrentTenant();
        return otherSpec == null ? tenantSpec : tenantSpec.and(otherSpec);
    }
}
