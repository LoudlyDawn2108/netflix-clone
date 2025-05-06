import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Interface for audit log entries
export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

/**
 * Service for tracking audit logs of security-critical operations
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    // Check if audit logging is enabled
    this.auditEnabled = this.configService.get<boolean>(
      'AUDIT_LOGGING_ENABLED',
      true,
    );

    if (this.auditEnabled) {
      this.logger.log('Audit logging is enabled');
    } else {
      this.logger.warn('Audit logging is disabled');
    }
  }

  /**
   * Log an audit event
   * @param entry The audit log entry
   */
  logAudit(entry: AuditLogEntry): void {
    if (!this.auditEnabled) {
      return;
    }

    try {
      // Sanitize the entry to avoid sensitive data in logs
      const sensitiveFields = ['password', 'token', 'secret'];
      const sanitizedMetadata = { ...entry.metadata };

      if (sanitizedMetadata) {
        for (const field of sensitiveFields) {
          if (field in sanitizedMetadata) {
            sanitizedMetadata[field] = '[REDACTED]';
          }
        }
      }

      const sanitizedEntry = {
        ...entry,
        metadata: sanitizedMetadata,
      };

      // In a production environment, we would likely write this to a database
      // or specialized audit logging system, but for now we'll use the logger
      this.logger.log({
        message: `AUDIT: ${entry.action}`,
        ...sanitizedEntry,
      });

      // Here you could implement additional storage like:
      // - Writing to a database table
      // - Sending to a specialized audit service
      // - Publishing to a message queue for async processing
    } catch (error) {
      // Don't let audit logging failures affect the application flow
      this.logger.error(
        `Failed to log audit entry: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log a security event (special case of audit logging)
   * @param action The security action
   * @param userId The user ID (if available)
   * @param metadata Additional metadata
   * @param ipAddress The IP address (if available)
   */
  logSecurityEvent(
    action: string,
    userId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
  ): void {
    this.logAudit({
      action,
      entityType: 'security',
      entityId: userId || 'anonymous',
      userId,
      metadata,
      timestamp: new Date(),
      ipAddress,
    });
  }
}
