import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TrustedDevice } from '../../users/entities/trusted-device.entity';
import { SecurityAuditService } from './security-audit.service';
import { EmailService } from '../../email/email.service';
import { TokenCacheService } from '../../../core/cache/token-cache.service';

@Injectable()
export class DeviceManagementService {
  constructor(
    @InjectRepository(TrustedDevice)
    private readonly trustedDeviceRepository: Repository<TrustedDevice>,
    private readonly securityAuditService: SecurityAuditService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly tokenCacheService: TokenCacheService,
  ) {}

  /**
   * Create a fingerprint for a device
   */
  generateDeviceFingerprint(req: Request): string {
    // Create a device fingerprint based on available headers and IP
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || 'unknown';
    const acceptEncoding = req.headers['accept-encoding'] || 'unknown';

    // Create a unique fingerprint (in production, you would use a more sophisticated algorithm)
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}-${ip}-${acceptLanguage}-${acceptEncoding}`)
      .digest('hex');

    return fingerprint;
  }

  /**
   * Register a new device for a user
   */
  async registerDevice(
    userId: string,
    deviceInfo: {
      deviceId: string;
      name?: string;
      deviceType?: string;
      browserInfo: string;
      operatingSystem: string;
      ipAddress: string;
      location?: string;
      geoData?: any;
    },
  ): Promise<TrustedDevice> {
    // Check if this device is already registered
    const existingDevice = await this.trustedDeviceRepository.findOne({
      where: { userId, deviceId: deviceInfo.deviceId },
    });

    if (existingDevice) {
      // Update the existing device with new info
      existingDevice.lastUsedAt = new Date();
      if (deviceInfo.location) existingDevice.location = deviceInfo.location;
      if (deviceInfo.geoData) existingDevice.geoData = deviceInfo.geoData;

      return this.trustedDeviceRepository.save(existingDevice);
    }

    // Create a new device entry
    const device = this.trustedDeviceRepository.create({
      userId,
      deviceId: deviceInfo.deviceId,
      name:
        deviceInfo.name || `Device ${new Date().toISOString().slice(0, 10)}`,
      deviceType: deviceInfo.deviceType || 'unknown',
      browserInfo: deviceInfo.browserInfo,
      operatingSystem: deviceInfo.operatingSystem,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      geoData: deviceInfo.geoData,
      lastUsedAt: new Date(),
      trustLevel: 'standard', // Default trust level
      isActive: true,
    });

    const savedDevice = await this.trustedDeviceRepository.save(device);

    // Log the new device registration
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'device_registered',
      eventSeverity: 'info',
      message: 'New device registered',
      ipAddress: deviceInfo.ipAddress,
      deviceInfo: JSON.stringify({
        deviceType: deviceInfo.deviceType,
        browserInfo: deviceInfo.browserInfo,
        operatingSystem: deviceInfo.operatingSystem,
      }),
      location: deviceInfo.location,
    });

    return savedDevice;
  }

  /**
   * Get device information from request
   */
  extractDeviceInfo(req: Request): {
    deviceId: string;
    deviceType: string;
    browserInfo: string;
    operatingSystem: string;
    ipAddress: string;
  } {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceId = this.generateDeviceFingerprint(req);

    // Simple user agent parsing (in production, use a proper user-agent parser)
    let deviceType = 'desktop';
    let browserInfo = 'unknown';
    let operatingSystem = 'unknown';

    if (userAgent.toLowerCase().includes('mobile')) {
      deviceType = 'mobile';
    } else if (userAgent.toLowerCase().includes('tablet')) {
      deviceType = 'tablet';
    }

    // Very basic browser detection
    if (userAgent.includes('Chrome')) {
      browserInfo = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browserInfo = 'Firefox';
    } else if (userAgent.includes('Safari')) {
      browserInfo = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browserInfo = 'Edge';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
      browserInfo = 'Internet Explorer';
    }

    // Very basic OS detection
    if (userAgent.includes('Windows')) {
      operatingSystem = 'Windows';
    } else if (userAgent.includes('Mac')) {
      operatingSystem = 'macOS';
    } else if (userAgent.includes('Linux')) {
      operatingSystem = 'Linux';
    } else if (userAgent.includes('Android')) {
      operatingSystem = 'Android';
    } else if (userAgent.includes('iOS')) {
      operatingSystem = 'iOS';
    }

    return {
      deviceId,
      deviceType,
      browserInfo,
      operatingSystem,
      ipAddress: req.ip || 'unknown',
    };
  }

  /**
   * Check if a device is trusted for a user
   */
  async isDeviceTrusted(userId: string, deviceId: string): Promise<boolean> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { userId, deviceId, isActive: true },
    });

    return !!device;
  }

  /**
   * Get trust level for a device
   */
  async getDeviceTrustLevel(userId: string, deviceId: string): Promise<string> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { userId, deviceId, isActive: true },
    });

    if (!device) {
      return 'unknown';
    }

    return device.trustLevel;
  }

  /**
   * Update device trust level
   */
  async updateDeviceTrustLevel(
    userId: string,
    deviceId: string,
    trustLevel: string,
  ): Promise<TrustedDevice> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { userId, deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.trustLevel = trustLevel;
    const updatedDevice = await this.trustedDeviceRepository.save(device);

    // Log the trust level change
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'device_trust_level_changed',
      eventSeverity: 'info',
      message: `Device trust level changed to ${trustLevel}`,
      deviceInfo: JSON.stringify({
        deviceId,
        deviceType: device.deviceType,
        browserInfo: device.browserInfo,
      }),
    });

    return updatedDevice;
  }

  /**
   * Get all trusted devices for a user
   */
  async getUserDevices(userId: string): Promise<TrustedDevice[]> {
    return this.trustedDeviceRepository.find({
      where: { userId },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Rename a device
   */
  async renameDevice(
    userId: string,
    deviceId: string,
    name: string,
  ): Promise<TrustedDevice> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { userId, deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.name = name;
    return this.trustedDeviceRepository.save(device);
  }

  /**
   * Revoke a device (mark as untrusted)
   */
  async revokeDevice(userId: string, deviceId: string): Promise<boolean> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { userId, deviceId },
    });

    if (!device) {
      return false;
    }

    // Mark device as inactive
    device.isActive = false;
    await this.trustedDeviceRepository.save(device);

    // Log the device revocation
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'device_revoked',
      eventSeverity: 'warning',
      message: 'Device access revoked',
      deviceInfo: JSON.stringify({
        deviceId,
        deviceType: device.deviceType,
        browserInfo: device.browserInfo,
      }),
    });

    // Find and revoke all sessions from this device
    // In a production system, you would iterate through all sessions in Redis
    // For this example, we'll just log the intention
    await this.tokenCacheService.revokeDeviceSessions(deviceId);

    return true;
  }

  /**
   * Check if a new device login should trigger additional verification
   * Returns true if additional verification is required
   */
  async requiresVerification(
    userId: string,
    deviceId: string,
    ipAddress: string,
  ): Promise<boolean> {
    // Check if this is a known device
    const isKnownDevice = await this.isDeviceTrusted(userId, deviceId);

    // If it's already trusted, no additional verification needed
    if (isKnownDevice) {
      return false;
    }

    // Otherwise this is a new device, so require verification
    return true;
  }

  /**
   * Send device verification email
   */
  async sendDeviceVerificationEmail(
    userId: string,
    email: string,
    deviceInfo: {
      deviceId: string;
      browserInfo: string;
      operatingSystem: string;
      ipAddress: string;
      location?: string;
    },
  ): Promise<string> {
    // Generate a verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store the token with device information in Redis with short expiry (15 minutes)
    await this.tokenCacheService.storeDeviceVerificationToken(
      userId,
      verificationToken,
      deviceInfo,
      900, // 15 minutes
    );

    // In a production app, send a real email with a verification link
    const verificationLink = `${this.configService.get('app.frontendUrl')}/verify-device/${verificationToken}`;

    await this.emailService.sendSecurityAlert(
      email,
      'Verify Your New Device',
      `We noticed a sign-in from a new device:<br><br>
      <strong>Browser:</strong> ${deviceInfo.browserInfo}<br>
      <strong>Operating System:</strong> ${deviceInfo.operatingSystem}<br>
      <strong>IP Address:</strong> ${deviceInfo.ipAddress}<br>
      <strong>Location:</strong> ${deviceInfo.location || 'Unknown'}<br><br>
      If this was you, please verify this device by clicking the link below:<br>
      <a href="${verificationLink}">${verificationLink}</a><br><br>
      If you didn't sign in from this device, please change your password immediately and contact support.`,
    );

    return verificationToken;
  }

  /**
   * Verify a new device with the verification token
   */
  async verifyDeviceWithToken(verificationToken: string): Promise<boolean> {
    // Get the stored token and device info from Redis
    const { userId, deviceInfo } =
      await this.tokenCacheService.getDeviceVerificationInfo(verificationToken);

    if (!userId || !deviceInfo) {
      return false;
    }

    // Register the device as trusted
    await this.registerDevice(userId, {
      deviceId: deviceInfo.deviceId,
      browserInfo: deviceInfo.browserInfo,
      operatingSystem: deviceInfo.operatingSystem,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
    });

    // Delete the verification token
    await this.tokenCacheService.deleteDeviceVerificationToken(
      verificationToken,
    );

    // Log the successful verification
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'device_verified',
      eventSeverity: 'info',
      message: 'New device verified',
      ipAddress: deviceInfo.ipAddress,
      deviceInfo: JSON.stringify(deviceInfo),
    });

    return true;
  }

  /**
   * Handle suspicious device activity
   */
  async handleSuspiciousDevice(
    userId: string,
    email: string,
    deviceInfo: {
      deviceId: string;
      browserInfo: string;
      operatingSystem: string;
      ipAddress: string;
      location?: string;
    },
    riskScore: number,
  ): Promise<void> {
    // Log the suspicious activity
    await this.securityAuditService.logSecurityEvent({
      userId,
      eventType: 'suspicious_device_activity',
      eventSeverity: riskScore > 70 ? 'critical' : 'warning',
      message: 'Suspicious device activity detected',
      ipAddress: deviceInfo.ipAddress,
      deviceInfo: JSON.stringify(deviceInfo),
      location: deviceInfo.location,
      isSuspicious: true,
      riskScore,
    });

    // Send security alert
    await this.emailService.sendSecurityAlert(
      email,
      'Suspicious Login Attempt Detected',
      `We detected a suspicious sign-in attempt to your account:<br><br>
      <strong>Browser:</strong> ${deviceInfo.browserInfo}<br>
      <strong>Operating System:</strong> ${deviceInfo.operatingSystem}<br>
      <strong>IP Address:</strong> ${deviceInfo.ipAddress}<br>
      <strong>Location:</strong> ${deviceInfo.location || 'Unknown'}<br><br>
      If this was you, you can ignore this message. If you didn't attempt to sign in, please change your password immediately and contact support.`,
    );
  }
}
