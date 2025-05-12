package com.streamflix.video.presentation;

import com.streamflix.video.infrastructure.gdpr.GdprComplianceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for GDPR compliance operations.
 */
@RestController
@RequestMapping("/api/v1/gdpr")
public class GdprController {

    private static final Logger logger = LoggerFactory.getLogger(GdprController.class);
    private final GdprComplianceService gdprService;
    
    public GdprController(GdprComplianceService gdprService) {
        this.gdprService = gdprService;
    }
    
    /**
     * Export a user's personal data (GDPR right to data portability)
     */
    @GetMapping("/export/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#userId)")
    public ResponseEntity<Resource> exportUserData(@PathVariable UUID userId) {
        logger.info("Received request to export data for user: {}", userId);
        
        byte[] data = gdprService.exportUserData(userId);
        ByteArrayResource resource = new ByteArrayResource(data);
        
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String filename = "streamflix-data-" + userId + "-" + timestamp + ".zip";
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(data.length)
                .body(resource);
    }
    
    /**
     * Request data anonymization (GDPR right to be forgotten)
     */
    @PostMapping("/anonymize/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#userId)")
    public ResponseEntity<?> requestAnonymization(@PathVariable UUID userId) {
        logger.info("Received request to anonymize data for user: {}", userId);
        
        // Create deletion request (will be processed after retention period)
        gdprService.anonymizeUser(userId);
        
        return ResponseEntity.accepted()
                .body(Map.of(
                    "message", "Anonymization request accepted",
                    "userId", userId,
                    "processingDate", LocalDateTime.now().plusDays(30)
                ));
    }
}
