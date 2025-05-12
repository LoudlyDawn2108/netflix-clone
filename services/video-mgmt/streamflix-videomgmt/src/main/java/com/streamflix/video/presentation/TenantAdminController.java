package com.streamflix.video.presentation;

import com.streamflix.video.application.port.TenantService;
import com.streamflix.video.domain.model.Tenant;
import com.streamflix.video.domain.model.Tenant.SubscriptionLevel;
import com.streamflix.video.presentation.dto.TenantCreateRequest;
import com.streamflix.video.presentation.dto.TenantResponse;
import com.streamflix.video.presentation.dto.TenantUpdateRequest;
import com.streamflix.video.presentation.mapper.TenantMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for tenant management operations.
 * Only accessible by administrators.
 */
@RestController
@RequestMapping("/api/v1/admin/tenants")
@PreAuthorize("hasRole('ADMIN')")
public class TenantAdminController {

    private static final Logger logger = LoggerFactory.getLogger(TenantAdminController.class);
    private final TenantService tenantService;
    private final TenantMapper tenantMapper;
    
    public TenantAdminController(TenantService tenantService, TenantMapper tenantMapper) {
        this.tenantService = tenantService;
        this.tenantMapper = tenantMapper;
    }
    
    /**
     * Create a new tenant
     */
    @PostMapping
    public ResponseEntity<TenantResponse> createTenant(@Valid @RequestBody TenantCreateRequest request) {
        logger.info("Creating new tenant: {}", request.getName());
        
        Tenant tenant = tenantService.createTenant(
            request.getName(), 
            request.getIdentifier(),
            SubscriptionLevel.valueOf(request.getSubscriptionLevel())
        );
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(tenantMapper.toResponse(tenant));
    }
    
    /**
     * Get all tenants
     */
    @GetMapping
    public ResponseEntity<List<TenantResponse>> getAllTenants() {
        logger.info("Retrieving all tenants");
        
        List<Tenant> tenants = tenantService.getAllTenants();
        List<TenantResponse> responses = tenants.stream()
            .map(tenantMapper::toResponse)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(responses);
    }
    
    /**
     * Get a tenant by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<TenantResponse> getTenantById(@PathVariable UUID id) {
        logger.info("Retrieving tenant with ID: {}", id);
        
        Tenant tenant = tenantService.getTenantById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Tenant not found with ID: " + id));
        
        return ResponseEntity.ok(tenantMapper.toResponse(tenant));
    }
    
    /**
     * Update a tenant's subscription level
     */
    @PutMapping("/{id}")
    public ResponseEntity<TenantResponse> updateTenant(
            @PathVariable UUID id, 
            @Valid @RequestBody TenantUpdateRequest request) {
        logger.info("Updating tenant with ID: {}", id);
        
        Tenant tenant = tenantService.updateSubscriptionLevel(
            id, 
            SubscriptionLevel.valueOf(request.getSubscriptionLevel())
        );
        
        return ResponseEntity.ok(tenantMapper.toResponse(tenant));
    }
    
    /**
     * Activate or deactivate a tenant
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<TenantResponse> setTenantStatus(
            @PathVariable UUID id,
            @RequestParam boolean active) {
        logger.info("Setting tenant {} status to: {}", id, active ? "active" : "inactive");
        
        Tenant tenant = tenantService.setActive(id, active);
        return ResponseEntity.ok(tenantMapper.toResponse(tenant));
    }
}
