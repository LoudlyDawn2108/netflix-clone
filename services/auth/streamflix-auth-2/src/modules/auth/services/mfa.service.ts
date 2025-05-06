import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { ConfigService } from '@nestjs/config';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { MfaBackupCode } from '../../users/entities/mfa-backup-code.entity';
import { TokenCacheService } from '../../../core/cache/token-cache.service';
import { EmailService } from '../../email/email.service';
import { EventsService } from '../../events/events.service';
import { SecurityAuditService } from './security-audit.service';

@Injectable()
export class MfaService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly tokenCacheService: TokenCacheService,
    private readonly emailService: EmailService,
    private readonly eventsService: EventsService,
    private readonly securityAuditService: SecurityAuditService,
    @InjectRepository(MfaBackupCode)
    private readonly backupCodesRepository: Repository<MfaBackupCode>,
  ) {
    // Configure the TOTP library
    authenticator.options = {
      step: 30, // 30-second window
      digits: 6, // 6-digit code
      algorithm: 'sha1',
    };
  }

  /**
   * Generate a new TOTP secret for a user
   */
  async generateTotpSecret(
    userId: string,
  ): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate a new TOTP secret
    const secret = authenticator.generateSecret();
    const appName = this.configService.get('app.name') || 'Streamflix';
    const issuer = this.configService.get('app.issuer') || 'Streamflix Auth';
    const otpAuthUrl = authenticator.keyuri(user.email, appName, secret);

    // Store the secret temporarily until verification
    await this.tokenCacheService.storeTempMfaSecret(userId, secret, 600); // 10 minutes expiry

    // Log the MFA setup init event
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'mfa_setup_initiated',
      eventSeverity: 'info',
      message: 'MFA setup initiated',
      eventData: { method: 'totp' },
    });

    return {
      secret,
      qrCodeUrl: otpAuthUrl,
    };
  }

  /**
   * Verify a TOTP token to enable MFA
   */
  async verifyAndEnableMfa(
    userId: string,
    token: string,
    mfaType = 'totp',
    phone?: string,
  ): Promise<{ success: boolean; backupCodes?: string[] }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get the temporary secret
    const secret = await this.tokenCacheService.getTempMfaSecret(userId);
    if (!secret) {
      throw new BadRequestException('MFA setup expired. Please try again.');
    }

    // Verify the token
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      await this.securityAuditService.logSecurityEvent({
        userId,
        eventType: 'mfa_setup_failed',
        eventSeverity: 'warning',
        message: 'Failed MFA verification during setup',
      });
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(userId);

    // Update user with MFA enabled
    await this.usersService.update(userId, {
      mfaEnabled: true,
      mfaSecret: secret,
      mfaType,
      mfaPhone: phone,
      mfaLastVerified: new Date(),
    });

    // Delete the temporary secret
    await this.tokenCacheService.deleteTempMfaSecret(userId);

    // Log the MFA enabled event
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'mfa_enabled',
      eventSeverity: 'info',
      message: `MFA enabled (${mfaType})`,
      eventData: { method: mfaType },
    });

    // Send email notification
    await this.emailService.sendSecurityAlert(
      user.email,
      'Multi-Factor Authentication Enabled',
      `Multi-factor authentication has been enabled for your account. This adds an extra layer of security to prevent unauthorized access.`,
    );

    return {
      success: true,
      backupCodes: backupCodes.map((code) => code.code),
    };
  }

  /**
   * Verify a TOTP token for login
   */
  async verifyMfaToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    // For TOTP verification
    if (user.mfaType === 'totp') {
      const isValid = authenticator.verify({
        token,
        secret: user.mfaSecret,
      });

      if (isValid) {
        // Update last verified time
        await this.usersService.update(userId, {
          mfaLastVerified: new Date(),
        });

        await this.securityAuditService.logSecurityEvent({
          userId,
          eventType: 'mfa_verified',
          eventSeverity: 'info',
          message: 'MFA successfully verified',
        });

        return true;
      }

      // Check if it's a backup code
      const isBackupCode = await this.verifyBackupCode(userId, token);
      if (isBackupCode) {
        return true;
      }

      await this.securityAuditService.logSecurityEvent({
        userId,
        eventType: 'mfa_verification_failed',
        eventSeverity: 'warning',
        message: 'Failed MFA verification attempt',
      });

      return false;
    }

    // For SMS or other verification types (to be implemented)
    if (user.mfaType === 'sms') {
      return await this.verifySmsMfaCode(userId, token);
    }

    return false;
  }

  /**
   * Verify SMS-based MFA code
   */
  private async verifySmsMfaCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    // Check if the code matches what we have in Redis cache
    const storedCode = await this.tokenCacheService.getSmsMfaCode(userId);

    if (storedCode && storedCode === code) {
      // Update last verified time
      await this.usersService.update(userId, {
        mfaLastVerified: new Date(),
      });

      // Delete the code after use
      await this.tokenCacheService.deleteSmsMfaCode(userId);

      await this.securityAuditService.logSecurityEvent({
        userId,
        eventType: 'mfa_verified',
        eventSeverity: 'info',
        message: 'SMS MFA successfully verified',
      });

      return true;
    }

    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'mfa_verification_failed',
      eventSeverity: 'warning',
      message: 'Failed SMS MFA verification attempt',
    });

    return false;
  }

  /**
   * Send MFA code via SMS
   */
  async sendSmsMfaCode(userId: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.mfaEnabled || user.mfaType !== 'sms' || !user.mfaPhone) {
      return false;
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the code with short expiration (5 minutes)
    await this.tokenCacheService.storeSmsMfaCode(userId, code, 300);

    // In real implementation, integrate with SMS provider like Twilio
    console.log(`[MOCK SMS] Sending MFA code ${code} to ${user.mfaPhone}`);

    // For demo purposes, we'll pretend it was sent
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'mfa_code_sent',
      eventSeverity: 'info',
      message: 'SMS MFA code sent',
      eventData: { phone: this.maskPhoneNumber(user.mfaPhone) },
    });

    return true;
  }

  /**
   * Generate backup codes for a user
   */
  private async generateBackupCodes(userId: string): Promise<MfaBackupCode[]> {
    // Delete any existing backup codes for this user
    await this.backupCodesRepository.delete({ userId });

    const codes: MfaBackupCode[] = [];
    const codeCount = 10; // Generate 10 backup codes

    for (let i = 0; i < codeCount; i++) {
      // Generate a secure random code (8 characters)
      const code = crypto.randomBytes(4).toString('hex');

      // Create expiry date (1 year from now)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Save the code to the database
      const backupCode = this.backupCodesRepository.create({
        userId,
        code,
        used: false,
        expiresAt,
      });

      const savedCode = await this.backupCodesRepository.save(backupCode);
      codes.push(savedCode);
    }

    return codes;
  }

  /**
   * Verify a backup code
   */
  private async verifyBackupCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    const backupCode = await this.backupCodesRepository.findOne({
      where: {
        userId,
        code,
        used: false,
        expiresAt: { $gt: new Date() }, // Not expired
      },
    });

    if (!backupCode) {
      return false;
    }

    // Mark the code as used
    backupCode.used = true;
    await this.backupCodesRepository.save(backupCode);

    // Update last verified time on the user
    await this.usersService.update(userId, {
      mfaLastVerified: new Date(),
    });

    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'mfa_backup_code_used',
      eventSeverity: 'info',
      message: 'Backup code used for MFA verification',
    });

    // If this was the last backup code, maybe send an email to generate new ones
    const remainingCodes = await this.backupCodesRepository.count({
      where: {
        userId,
        used: false,
        expiresAt: { $gt: new Date() },
      },
    });

    if (remainingCodes <= 2) {
      const user = await this.usersService.findById(userId);
      await this.emailService.sendSecurityAlert(
        user.email,
        'Low MFA Backup Codes Remaining',
        `You have only ${remainingCodes} MFA backup codes remaining. We recommend generating new backup codes in your security settings.`,
      );
    }

    return true;
  }

  /**
   * Get remaining backup codes for a user
   */
  async getRemainingBackupCodes(
    userId: string,
  ): Promise<{ used: number; unused: number }> {
    const usedCount = await this.backupCodesRepository.count({
      where: { userId, used: true },
    });

    const unusedCount = await this.backupCodesRepository.count({
      where: {
        userId,
        used: false,
        expiresAt: { $gt: new Date() }, // Not expired
      },
    });

    return { used: usedCount, unused: unusedCount };
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.mfaEnabled) {
      return false;
    }

    // Update user record
    await this.usersService.update(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaType: 'none',
      mfaPhone: null,
    });

    // Delete all backup codes
    await this.backupCodesRepository.delete({ userId });

    // Log the event
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'mfa_disabled',
      eventSeverity: 'warning',
      message: 'Multi-factor authentication disabled',
    });

    // Send security notification
    await this.emailService.sendSecurityAlert(
      user.email,
      'Multi-Factor Authentication Disabled',
      `Multi-factor authentication has been disabled for your account. If you did not make this change, please contact support immediately as your account may be compromised.`,
    );

    return true;
  }

  /**
   * Check if user requires MFA verification for current session
   */
  async requiresMfaVerification(userId: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.mfaEnabled) {
      return false;
    }

    // If MFA is enforced by admin, always require it
    if (user.mfaEnforced) {
      return true;
    }

    // Get last verification time
    const lastVerified = user.mfaLastVerified;

    // If never verified or last verification is older than the configured time, require verification
    if (!lastVerified) {
      return true;
    }

    // Check if last verification is older than the configured interval (default 24 hours)
    const mfaSessionDuration =
      this.configService.get<number>('security.mfaSessionHours') || 24;
    const expiryTime = new Date(lastVerified);
    expiryTime.setHours(expiryTime.getHours() + mfaSessionDuration);

    return new Date() > expiryTime;
  }

  /**
   * Generate new backup codes for a user
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.mfaEnabled) {
      throw new BadRequestException(
        'MFA must be enabled to generate backup codes',
      );
    }

    const backupCodes = await this.generateBackupCodes(userId);

    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'mfa_backup_codes_regenerated',
      eventSeverity: 'info',
      message: 'MFA backup codes regenerated',
    });

    return backupCodes.map((code) => code.code);
  }

  /**
   * Utility to mask phone number for logs/display
   */
  private maskPhoneNumber(phone: string): string {
    if (!phone) return '';
    return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
  }
}
