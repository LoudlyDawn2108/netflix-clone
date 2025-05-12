package com.streamflix.video.presentation.controller;

import com.streamflix.video.infrastructure.gdpr.GdprComplianceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for GDPR-related operations.
 */
@RestController
@RequestMapping("/api/v1/gdpr")
public class GdprController {

    private static final Logger logger = LoggerFactory.getLogger(GdprController.class);
    
    private final GdprComplianceService gdprComplianceService;
    
    public GdprController(GdprComplianceService gdprComplianceService) {
        this.gdprComplianceService = gdprComplianceService;
    }
    
    /**
     * Request export of a user's personal data
     * @param userId The user ID
     * @return ZIP file containing user data
     */
    @GetMapping("/export/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#userId)")
    public ResponseEntity<byte[]> exportUserData(@PathVariable UUID userId) {
        logger.info("Received request to export data for user ID: {}", userId);
        
        byte[] data = gdprComplianceService.exportUserData(userId);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        String filename = "user_data_" + userId + "_" + 
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".zip";
        headers.setContentDispositionFormData("attachment", filename);
        
        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }
    
    /**
     * Request erasure (right to be forgotten) for a user
     * @param userId The user ID
     * @return Confirmation response
     */
    @PostMapping("/erase/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#userId)")
    public ResponseEntity<Map<String, String>> requestErasure(@PathVariable UUID userId) {
        logger.info("Received erasure request for user ID: {}", userId);
        
        gdprComplianceService.anonymizeUser(userId);
        
        return ResponseEntity.ok(Map.of(
            "message", "User data anonymization process has been initiated",
            "userId", userId.toString(),
            "requestedAt", LocalDateTime.now().toString()
        ));
    }
    
    /**
     * Administrative endpoint to trigger anonymization of expired data
     * Only accessible by administrators
     * @param tenantId The tenant ID
     * @return Result summary
     */
    @PostMapping("/admin/anonymize-expired/{tenantId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> anonymizeExpiredData(@PathVariable UUID tenantId) {
        logger.info("Admin request to anonymize expired data for tenant: {}", tenantId);
        
        int count = gdprComplianceService.anonymizeExpiredUserData(tenantId);
        
        return ResponseEntity.ok(Map.of(
            "message", "Anonymization process completed",
            "tenantId", tenantId.toString(),
            "recordsAnonymized", count,
            "processedAt", LocalDateTime.now().toString()
        ));
    }
}
