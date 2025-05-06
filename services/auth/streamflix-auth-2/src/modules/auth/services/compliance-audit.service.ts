import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../../users/entities/user.entity';
import { PrivacyConsent } from '../entities/privacy-consent.entity';
import { DataExport } from '../entities/data-export.entity';

@Injectable()
export class ComplianceAuditService {
  private readonly logger = new Logger(ComplianceAuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(PrivacyConsent)
    private readonly privacyConsentRepository: Repository<PrivacyConsent>,
    @InjectRepository(DataExport)
    private readonly dataExportRepository: Repository<DataExport>,
    private readonly configService: ConfigService,
  ) {
    // Initialize data retention policy job
    this.scheduleDataRetentionJob();
  }

  /**
   * Create an audit log entry
   * @param action The action being audited
   * @param userId The user performing the action (optional)
   * @param resourceType The type of resource being acted upon (e.g., 'user', 'token')
   * @param resourceId The ID of the resource (optional)
   * @param data Additional data to include in the audit log (optional)
   * @param ipAddress IP address of the request (optional)
   * @param userAgent User agent of the request (optional)
   */
  async createAuditLog(
    action: string,
    userId?: string,
    resourceType?: string,
    resourceId?: string,
    data?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    try {
      const auditLog = new AuditLog();
      auditLog.action = action;
      auditLog.userId = userId;
      auditLog.resourceType = resourceType;
      auditLog.resourceId = resourceId;
      auditLog.data = data;
      auditLog.ipAddress = ipAddress;
      auditLog.userAgent = userAgent;
      auditLog.timestamp = new Date();

      return await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
      // Don't throw, just log the error to prevent disrupting the main application flow
      return null;
    }
  }

  /**
   * Get audit logs for a specific user
   * @param userId The user ID to filter by
   * @param page Page number (1-based)
   * @param limit Number of records per page
   */
  async getUserAuditLogs(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { userId },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { logs, total };
  }

  /**
   * Get audit logs for a specific resource
   * @param resourceType The resource type to filter by
   * @param resourceId The resource ID to filter by
   * @param page Page number (1-based)
   * @param limit Number of records per page
   */
  async getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
    page = 1,
    limit = 20,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { resourceType, resourceId },
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { logs, total };
  }

  /**
   * Search audit logs with various filters
   * @param filters Filter criteria
   * @param page Page number (1-based)
   * @param limit Number of records per page
   */
  async searchAuditLogs(
    filters: {
      action?: string;
      userId?: string;
      resourceType?: string;
      resourceId?: string;
      ipAddress?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page = 1,
    limit = 20,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where: any = {};

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    if (filters.startDate && filters.endDate) {
      where.timestamp = Between(filters.startDate, filters.endDate);
    } else if (filters.startDate) {
      where.timestamp = Between(filters.startDate, new Date());
    } else if (filters.endDate) {
      where.timestamp = LessThan(filters.endDate);
    }

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { logs, total };
  }

  /**
   * Record user consent to privacy policy or terms of service
   * @param userId The user ID
   * @param consentType The type of consent ('privacy_policy', 'terms_of_service', etc.)
   * @param version The version of the document consented to
   * @param ipAddress The IP address of the user when consent was given
   * @param userAgent The user agent of the user when consent was given
   */
  async recordConsent(
    userId: string,
    consentType: string,
    version: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PrivacyConsent> {
    const consent = new PrivacyConsent();
    consent.userId = userId;
    consent.consentType = consentType;
    consent.version = version;
    consent.ipAddress = ipAddress;
    consent.userAgent = userAgent;
    consent.timestamp = new Date();

    const savedConsent = await this.privacyConsentRepository.save(consent);

    // Create audit log for the consent
    await this.createAuditLog(
      'PRIVACY_CONSENT_GIVEN',
      userId,
      'privacy_consent',
      savedConsent.id,
      { consentType, version },
      ipAddress,
      userAgent,
    );

    return savedConsent;
  }

  /**
   * Check if a user has given consent for a specific type and version
   * @param userId The user ID
   * @param consentType The type of consent
   * @param version The version of the document (optional)
   */
  async hasUserConsented(
    userId: string,
    consentType: string,
    version?: string,
  ): Promise<boolean> {
    const where: any = { userId, consentType };

    if (version) {
      where.version = version;
    }

    const consent = await this.privacyConsentRepository.findOne({ where });
    return !!consent;
  }

  /**
   * Get the latest consent for a user and type
   * @param userId The user ID
   * @param consentType The type of consent
   */
  async getUserLatestConsent(
    userId: string,
    consentType: string,
  ): Promise<PrivacyConsent> {
    return this.privacyConsentRepository.findOne({
      where: { userId, consentType },
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Request data export for a user (GDPR right to data portability)
   * @param userId The user ID
   * @param requestedBy Who requested the export (usually same as userId, but could be admin)
   * @param format Export format (e.g., 'json', 'csv')
   */
  async requestDataExport(
    userId: string,
    requestedBy: string,
    format = 'json',
  ): Promise<DataExport> {
    const dataExport = new DataExport();
    dataExport.userId = userId;
    dataExport.requestedBy = requestedBy;
    dataExport.format = format;
    dataExport.status = 'pending';
    dataExport.requestId = uuidv4();
    dataExport.expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );

    const savedExport = await this.dataExportRepository.save(dataExport);

    // Create audit log for the export request
    await this.createAuditLog(
      'DATA_EXPORT_REQUESTED',
      requestedBy,
      'user',
      userId,
      { format, requestId: savedExport.requestId },
    );

    // In a real implementation, we would trigger an asynchronous job to generate the export
    // For demonstration purposes, we'll just return the request
    return savedExport;
  }

  /**
   * Get the status of a data export request
   * @param requestId The request ID
   */
  async getDataExportStatus(requestId: string): Promise<DataExport> {
    return this.dataExportRepository.findOne({
      where: { requestId },
    });
  }

  /**
   * Apply retention policy to audit logs
   * @param days Number of days to keep logs (default from config)
   */
  async applyAuditLogRetention(days?: number): Promise<number> {
    const retentionDays =
      days || this.configService.get('compliance.auditLogRetentionDays', 365);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditLogRepository.delete({
      timestamp: LessThan(cutoffDate),
    });

    this.logger.log(
      `Applied audit log retention policy: deleted ${result.affected} logs older than ${retentionDays} days`,
    );
    return result.affected;
  }

  /**
   * Schedule the data retention job
   */
  private scheduleDataRetentionJob(): void {
    const runRetentionJob = async () => {
      try {
        await this.applyAuditLogRetention();

        // Also clean up expired data exports
        const result = await this.dataExportRepository.delete({
          expiresAt: LessThan(new Date()),
        });

        this.logger.log(`Cleaned up ${result.affected} expired data exports`);
      } catch (error) {
        this.logger.error(
          `Error running data retention job: ${error.message}`,
          error.stack,
        );
      }
    };

    // Run retention job every day at 2 AM
    const msUntil2AM = () => {
      const now = new Date();
      const next2AM = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getHours() >= 2 ? now.getDate() + 1 : now.getDate(),
        2,
        0,
        0,
      );
      return next2AM.getTime() - now.getTime();
    };

    // Initial run after service starts (delayed by 10 minutes)
    setTimeout(
      async () => {
        await runRetentionJob();

        // Then schedule daily runs
        setInterval(runRetentionJob, 24 * 60 * 60 * 1000); // 24 hours
      },
      Math.min(msUntil2AM(), 10 * 60 * 1000),
    ); // 10 minutes or until 2 AM, whichever is sooner
  }

  /**
   * Generate compliance report for a date range
   * @param startDate Start date for the report
   * @param endDate End date for the report
   * @param reportType Type of report to generate
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    reportType:
      | 'login_activity'
      | 'data_access'
      | 'privacy_consents'
      | 'security_events',
  ): Promise<any> {
    // Report data structure
    const report = {
      generatedAt: new Date(),
      reportType,
      period: { startDate, endDate },
      summary: {},
      details: [],
    };

    switch (reportType) {
      case 'login_activity':
        return this.generateLoginActivityReport(report, startDate, endDate);

      case 'data_access':
        return this.generateDataAccessReport(report, startDate, endDate);

      case 'privacy_consents':
        return this.generatePrivacyConsentsReport(report, startDate, endDate);

      case 'security_events':
        return this.generateSecurityEventsReport(report, startDate, endDate);

      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  /**
   * Generate login activity report
   */
  private async generateLoginActivityReport(
    report: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const loginLogs = await this.auditLogRepository.find({
      where: {
        action: 'USER_LOGIN',
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    const failedLoginLogs = await this.auditLogRepository.find({
      where: {
        action: 'LOGIN_FAILED',
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    // Group by user ID
    const userLogins = {};
    loginLogs.forEach((log) => {
      if (!userLogins[log.userId]) {
        userLogins[log.userId] = [];
      }
      userLogins[log.userId].push(log);
    });

    // Group failed logins by IP address
    const ipFailedLogins = {};
    failedLoginLogs.forEach((log) => {
      if (!ipFailedLogins[log.ipAddress]) {
        ipFailedLogins[log.ipAddress] = 0;
      }
      ipFailedLogins[log.ipAddress]++;
    });

    // Prepare summary
    report.summary = {
      totalLogins: loginLogs.length,
      totalFailedLogins: failedLoginLogs.length,
      uniqueUsers: Object.keys(userLogins).length,
      topIpAddressesByFailedLogins: Object.entries(ipFailedLogins)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count })),
    };

    // Prepare details
    report.details = loginLogs
      .map((log) => ({
        timestamp: log.timestamp,
        userId: log.userId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        success: true,
      }))
      .concat(
        failedLoginLogs.map((log) => ({
          timestamp: log.timestamp,
          userId: log.userId,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          success: false,
          reason: log.data?.reason || 'Unknown',
        })),
      );

    return report;
  }

  /**
   * Generate data access report
   */
  private async generateDataAccessReport(
    report: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const accessLogs = await this.auditLogRepository.find({
      where: [
        {
          action: 'DATA_ACCESSED',
          timestamp: Between(startDate, endDate),
        },
        {
          action: 'DATA_EXPORTED',
          timestamp: Between(startDate, endDate),
        },
        {
          action: 'DATA_MODIFIED',
          timestamp: Between(startDate, endDate),
        },
      ],
      order: { timestamp: 'ASC' },
    });

    // Group by resource type
    const resourceTypeAccess = {};
    accessLogs.forEach((log) => {
      if (!resourceTypeAccess[log.resourceType]) {
        resourceTypeAccess[log.resourceType] = {
          accessed: 0,
          exported: 0,
          modified: 0,
        };
      }

      if (log.action === 'DATA_ACCESSED') {
        resourceTypeAccess[log.resourceType].accessed++;
      } else if (log.action === 'DATA_EXPORTED') {
        resourceTypeAccess[log.resourceType].exported++;
      } else if (log.action === 'DATA_MODIFIED') {
        resourceTypeAccess[log.resourceType].modified++;
      }
    });

    // Prepare summary
    report.summary = {
      totalAccesses: accessLogs.length,
      accessesByResourceType: resourceTypeAccess,
    };

    // Prepare details
    report.details = accessLogs.map((log) => ({
      timestamp: log.timestamp,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      userId: log.userId,
      ipAddress: log.ipAddress,
      data: log.data,
    }));

    return report;
  }

  /**
   * Generate privacy consents report
   */
  private async generatePrivacyConsentsReport(
    report: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const consents = await this.privacyConsentRepository.find({
      where: {
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    // Group by consent type and version
    const consentsByType = {};
    consents.forEach((consent) => {
      if (!consentsByType[consent.consentType]) {
        consentsByType[consent.consentType] = {};
      }

      if (!consentsByType[consent.consentType][consent.version]) {
        consentsByType[consent.consentType][consent.version] = 0;
      }

      consentsByType[consent.consentType][consent.version]++;
    });

    // Prepare summary
    report.summary = {
      totalConsents: consents.length,
      consentsByType,
    };

    // Prepare details
    report.details = consents.map((consent) => ({
      timestamp: consent.timestamp,
      userId: consent.userId,
      consentType: consent.consentType,
      version: consent.version,
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
    }));

    return report;
  }

  /**
   * Generate security events report
   */
  private async generateSecurityEventsReport(
    report: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const securityLogs = await this.auditLogRepository.find({
      where: [
        {
          action: 'SECURITY_EVENT',
          timestamp: Between(startDate, endDate),
        },
        {
          action: 'PASSWORD_CHANGED',
          timestamp: Between(startDate, endDate),
        },
        {
          action: 'MFA_ENABLED',
          timestamp: Between(startDate, endDate),
        },
        {
          action: 'MFA_DISABLED',
          timestamp: Between(startDate, endDate),
        },
        {
          action: 'ACCOUNT_LOCKED',
          timestamp: Between(startDate, endDate),
        },
        {
          action: 'ACCOUNT_UNLOCKED',
          timestamp: Between(startDate, endDate),
        },
      ],
      order: { timestamp: 'ASC' },
    });

    // Group by event type
    const eventCounts = {};
    securityLogs.forEach((log) => {
      if (!eventCounts[log.action]) {
        eventCounts[log.action] = 0;
      }
      eventCounts[log.action]++;
    });

    // Prepare summary
    report.summary = {
      totalEvents: securityLogs.length,
      eventsByType: eventCounts,
    };

    // Prepare details
    report.details = securityLogs.map((log) => ({
      timestamp: log.timestamp,
      action: log.action,
      userId: log.userId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      data: log.data,
    }));

    return report;
  }
}
