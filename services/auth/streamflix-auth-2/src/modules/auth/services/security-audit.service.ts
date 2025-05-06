import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SecurityAuditLog } from '../../users/entities/security-audit-log.entity';

@Injectable()
export class SecurityAuditService {
  private lastLogHash: string;

  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly securityAuditLogRepository: Repository<SecurityAuditLog>,
    private readonly configService: ConfigService,
  ) {
    // Initialize last hash on service start
    this.initializeLastHash();
  }

  /**
   * Initialize the last hash from the most recent log entry
   */
  private async initializeLastHash(): Promise<void> {
    // Get most recent log entry for hash chain
    const lastLog = await this.securityAuditLogRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    this.lastLogHash = lastLog?.hashChain || this.generateInitialHash();
  }

  /**
   * Generate initial hash for the first log entry
   */
  private generateInitialHash(): string {
    // Use a server secret combined with timestamp for initial hash
    const serverSecret =
      this.configService.get<string>('security.auditLogSecret') ||
      'streamflix-audit-logs';
    return crypto
      .createHash('sha256')
      .update(`${serverSecret}-${new Date().toISOString()}`)
      .digest('hex');
  }

  /**
   * Log a security event with tamper-evident hash chain
   */
  async logSecurityEvent(eventData: {
    userId?: string;
    eventType: string;
    eventSeverity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    location?: string;
    sessionId?: string;
    isSuspicious?: boolean;
    riskScore?: number;
    eventData?: any;
  }): Promise<SecurityAuditLog> {
    // Create the log entry
    const logEntry = this.securityAuditLogRepository.create({
      userId: eventData.userId,
      eventType: eventData.eventType,
      eventSeverity: eventData.eventSeverity,
      message: eventData.message,
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent,
      deviceInfo: eventData.deviceInfo,
      location: eventData.location,
      sessionId: eventData.sessionId,
      isSuspicious: eventData.isSuspicious || false,
      riskScore: eventData.riskScore || 0,
      eventData: eventData.eventData || {},
    });

    // Generate hash chain value based on previous hash and current entry
    const entryData = JSON.stringify({
      userId: logEntry.userId,
      eventType: logEntry.eventType,
      eventSeverity: logEntry.eventSeverity,
      message: logEntry.message,
      timestamp: new Date().toISOString(),
      data: logEntry.eventData,
    });

    // Create tamper-evident hash chain by hashing previous hash + current data
    logEntry.hashChain = crypto
      .createHash('sha256')
      .update(`${this.lastLogHash}-${entryData}`)
      .digest('hex');

    // Save log entry
    const savedLog = await this.securityAuditLogRepository.save(logEntry);

    // Update last hash for next chain
    this.lastLogHash = savedLog.hashChain;

    return savedLog;
  }

  /**
   * Get all security audit logs for a user
   */
  async getUserSecurityLogs(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      eventTypes?: string[];
      severities?: string[];
      fromDate?: Date;
      toDate?: Date;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ logs: SecurityAuditLog[]; total: number }> {
    const query = this.securityAuditLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId });

    // Apply filters
    if (options?.eventTypes && options.eventTypes.length > 0) {
      query.andWhere('log.eventType IN (:...eventTypes)', {
        eventTypes: options.eventTypes,
      });
    }

    if (options?.severities && options.severities.length > 0) {
      query.andWhere('log.eventSeverity IN (:...severities)', {
        severities: options.severities,
      });
    }

    if (options?.fromDate) {
      query.andWhere('log.createdAt >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    if (options?.toDate) {
      query.andWhere('log.createdAt <= :toDate', { toDate: options.toDate });
    }

    // Apply sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'DESC';
    query.orderBy(`log.${sortBy}`, sortOrder);

    // Apply pagination
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    // Execute query
    const [logs, total] = await query.getManyAndCount();

    return { logs, total };
  }

  /**
   * Get all security logs for an IP address
   */
  async getIpSecurityLogs(
    ipAddress: string,
    options?: {
      page?: number;
      limit?: number;
      fromDate?: Date;
      toDate?: Date;
    },
  ): Promise<{ logs: SecurityAuditLog[]; total: number }> {
    const query = this.securityAuditLogRepository
      .createQueryBuilder('log')
      .where('log.ipAddress = :ipAddress', { ipAddress });

    // Apply date filters if provided
    if (options?.fromDate) {
      query.andWhere('log.createdAt >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    if (options?.toDate) {
      query.andWhere('log.createdAt <= :toDate', { toDate: options.toDate });
    }

    // Apply sorting
    query.orderBy('log.createdAt', 'DESC');

    // Apply pagination
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    // Execute query
    const [logs, total] = await query.getManyAndCount();

    return { logs, total };
  }

  /**
   * Get all suspicious activity logs
   */
  async getSuspiciousActivityLogs(options?: {
    page?: number;
    limit?: number;
    minRiskScore?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{ logs: SecurityAuditLog[]; total: number }> {
    const query = this.securityAuditLogRepository
      .createQueryBuilder('log')
      .where('log.isSuspicious = :isSuspicious', { isSuspicious: true });

    if (options?.minRiskScore) {
      query.andWhere('log.riskScore >= :minRiskScore', {
        minRiskScore: options.minRiskScore,
      });
    }

    // Apply date filters if provided
    if (options?.fromDate) {
      query.andWhere('log.createdAt >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    if (options?.toDate) {
      query.andWhere('log.createdAt <= :toDate', { toDate: options.toDate });
    }

    // Apply sorting - highest risk first, then most recent
    query.orderBy('log.riskScore', 'DESC');
    query.addOrderBy('log.createdAt', 'DESC');

    // Apply pagination
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    // Execute query
    const [logs, total] = await query.getManyAndCount();

    return { logs, total };
  }

  /**
   * Verify the integrity of the audit log chain
   * This would typically be called as part of an admin function or scheduled job
   */
  async verifyLogChainIntegrity(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ valid: boolean; invalidLogs?: SecurityAuditLog[] }> {
    // Build query to get logs in chronological order
    const query = this.securityAuditLogRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'ASC');

    if (startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const logs = await query.getMany();

    if (logs.length === 0) {
      return { valid: true };
    }

    let lastHash = logs[0].hashChain;
    const invalidLogs: SecurityAuditLog[] = [];

    // Start from second log to verify chain
    for (let i = 1; i < logs.length; i++) {
      const currentLog = logs[i];
      const previousLog = logs[i - 1];

      // Reconstruct what the hash should be
      const entryData = JSON.stringify({
        userId: previousLog.userId,
        eventType: previousLog.eventType,
        eventSeverity: previousLog.eventSeverity,
        message: previousLog.message,
        timestamp: previousLog.createdAt.toISOString(),
        data: previousLog.eventData,
      });

      const calculatedHash = crypto
        .createHash('sha256')
        .update(`${lastHash}-${entryData}`)
        .digest('hex');

      // Check if the stored hash matches the calculated hash
      if (calculatedHash !== currentLog.hashChain) {
        invalidLogs.push(currentLog);
      }

      lastHash = currentLog.hashChain;
    }

    return {
      valid: invalidLogs.length === 0,
      invalidLogs: invalidLogs.length > 0 ? invalidLogs : undefined,
    };
  }

  /**
   * Export logs for forensic analysis
   * This would typically be used by security teams
   */
  async exportSecurityLogs(options?: {
    userId?: string;
    ipAddress?: string;
    eventTypes?: string[];
    fromDate?: Date;
    toDate?: Date;
    isSuspicious?: boolean;
    minRiskScore?: number;
  }): Promise<SecurityAuditLog[]> {
    const query = this.securityAuditLogRepository.createQueryBuilder('log');
    let hasCondition = false;

    if (options?.userId) {
      query.where('log.userId = :userId', { userId: options.userId });
      hasCondition = true;
    }

    if (options?.ipAddress) {
      if (hasCondition) {
        query.andWhere('log.ipAddress = :ipAddress', {
          ipAddress: options.ipAddress,
        });
      } else {
        query.where('log.ipAddress = :ipAddress', {
          ipAddress: options.ipAddress,
        });
        hasCondition = true;
      }
    }

    if (options?.eventTypes && options.eventTypes.length > 0) {
      if (hasCondition) {
        query.andWhere('log.eventType IN (:...eventTypes)', {
          eventTypes: options.eventTypes,
        });
      } else {
        query.where('log.eventType IN (:...eventTypes)', {
          eventTypes: options.eventTypes,
        });
        hasCondition = true;
      }
    }

    if (options?.fromDate) {
      if (hasCondition) {
        query.andWhere('log.createdAt >= :fromDate', {
          fromDate: options.fromDate,
        });
      } else {
        query.where('log.createdAt >= :fromDate', {
          fromDate: options.fromDate,
        });
        hasCondition = true;
      }
    }

    if (options?.toDate) {
      if (hasCondition) {
        query.andWhere('log.createdAt <= :toDate', { toDate: options.toDate });
      } else {
        query.where('log.createdAt <= :toDate', { toDate: options.toDate });
        hasCondition = true;
      }
    }

    if (options?.isSuspicious !== undefined) {
      if (hasCondition) {
        query.andWhere('log.isSuspicious = :isSuspicious', {
          isSuspicious: options.isSuspicious,
        });
      } else {
        query.where('log.isSuspicious = :isSuspicious', {
          isSuspicious: options.isSuspicious,
        });
        hasCondition = true;
      }
    }

    if (options?.minRiskScore !== undefined) {
      if (hasCondition) {
        query.andWhere('log.riskScore >= :minRiskScore', {
          minRiskScore: options.minRiskScore,
        });
      } else {
        query.where('log.riskScore >= :minRiskScore', {
          minRiskScore: options.minRiskScore,
        });
      }
    }

    // Order by creation date
    query.orderBy('log.createdAt', 'ASC');

    // Return all logs matching criteria - no pagination for export
    return query.getMany();
  }
}
