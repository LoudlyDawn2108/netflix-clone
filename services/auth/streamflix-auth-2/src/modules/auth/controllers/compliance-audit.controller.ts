import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ComplianceAuditService } from '../services/compliance-audit.service';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { Request } from 'express';

// DTOs
class RecordConsentDto {
  consentType: string;
  version: string;
}

class RequestDataExportDto {
  format?: string; // Optional, defaults to 'json'
}

class GenerateComplianceReportDto {
  startDate: Date;
  endDate: Date;
  reportType:
    | 'login_activity'
    | 'data_access'
    | 'privacy_consents'
    | 'security_events';
}

@Controller('compliance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ComplianceAuditController {
  private readonly logger = new Logger(ComplianceAuditController.name);

  constructor(private readonly complianceService: ComplianceAuditService) {}

  /**
   * Record user consent for privacy policy or terms of service
   */
  @Post('consent')
  async recordConsent(
    @Body(ValidationPipe) consentDto: RecordConsentDto,
    @GetUser() user: User,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const consent = await this.complianceService.recordConsent(
      user.id,
      consentDto.consentType,
      consentDto.version,
      ipAddress,
      userAgent,
    );

    return {
      message: 'Consent recorded successfully',
      timestamp: consent.timestamp,
    };
  }

  /**
   * Check if user has given consent for a specific type and version
   */
  @Get('consent/:consentType')
  async checkConsent(
    @Param('consentType') consentType: string,
    @Query('version') version: string,
    @GetUser() user: User,
  ) {
    const hasConsented = await this.complianceService.hasUserConsented(
      user.id,
      consentType,
      version,
    );

    if (!version) {
      const latestConsent = await this.complianceService.getUserLatestConsent(
        user.id,
        consentType,
      );

      return {
        hasConsented,
        latestVersion: latestConsent?.version,
        timestamp: latestConsent?.timestamp,
      };
    }

    return { hasConsented };
  }

  /**
   * Request a data export (GDPR right to data portability)
   */
  @Post('export')
  async requestDataExport(
    @Body(ValidationPipe) exportDto: RequestDataExportDto,
    @GetUser() user: User,
  ) {
    const dataExport = await this.complianceService.requestDataExport(
      user.id,
      user.id, // Self-requested
      exportDto.format || 'json',
    );

    return {
      message: 'Data export request created',
      requestId: dataExport.requestId,
      status: dataExport.status,
      expiresAt: dataExport.expiresAt,
    };
  }

  /**
   * Check the status of a data export request
   */
  @Get('export/:requestId')
  async checkExportStatus(
    @Param('requestId') requestId: string,
    @GetUser() user: User,
  ) {
    const dataExport =
      await this.complianceService.getDataExportStatus(requestId);

    if (!dataExport) {
      throw new HttpException('Export request not found', HttpStatus.NOT_FOUND);
    }

    if (dataExport.userId !== user.id && !user.isAdmin) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    return {
      requestId: dataExport.requestId,
      status: dataExport.status,
      format: dataExport.format,
      expiresAt: dataExport.expiresAt,
      completedAt: dataExport.completedAt,
      fileSize: dataExport.fileSize,
    };
  }

  /**
   * Get audit logs for the current user
   */
  @Get('audit-logs')
  async getUserAuditLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @GetUser() user: User,
  ) {
    return this.complianceService.getUserAuditLogs(user.id, page, limit);
  }

  /**
   * Admin: Search audit logs with filters
   */
  @Get('audit-logs/search')
  @Roles('admin', 'security-officer', 'compliance-officer')
  async searchAuditLogs(
    @Query('action') action: string,
    @Query('userId') userId: string,
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
    @Query('ipAddress') ipAddress: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.complianceService.searchAuditLogs(
      {
        action,
        userId,
        resourceType,
        resourceId,
        ipAddress,
        startDate,
        endDate,
      },
      page,
      limit,
    );
  }

  /**
   * Admin: Generate compliance report
   */
  @Post('reports')
  @Roles('admin', 'compliance-officer')
  async generateComplianceReport(
    @Body(ValidationPipe) reportDto: GenerateComplianceReportDto,
  ) {
    return this.complianceService.generateComplianceReport(
      reportDto.startDate,
      reportDto.endDate,
      reportDto.reportType,
    );
  }
}
