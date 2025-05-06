import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SecurityAuditService } from './security-audit.service';
import { EmailService } from '../../email/email.service';
import { TokenCacheService } from '../../../core/cache/token-cache.service';
import { DeviceManagementService } from './device-management.service';
import { SecurityAuditLog } from '../../users/entities/security-audit-log.entity';
import { User } from '../../users/entities/user.entity';

interface RiskFactors {
  newDevice: boolean;
  locationChange: boolean;
  unusualTime: boolean;
  unusualIpRange: boolean;
  vpnOrProxyDetected: boolean;
  rapidGeoImpossibility: boolean;
  bruteForceAttempts: boolean;
  accountAgeDays: number;
  previousSuspiciousActivity: boolean;
  highRiskCountry: boolean;
}

@Injectable()
export class FraudDetectionService {
  // List of high-risk country codes based on fraud statistics
  private highRiskCountries: string[] = [
    // This would be populated from a configuration or external data source
    // Example list for demonstration purposes
    'NG',
    'RU',
    'UA',
    'CN',
    'VN',
    'ID',
    'BY',
    'TR',
    'RO',
    'BG',
  ];

  // List of known VPN/proxy address prefixes (simplified for demonstration)
  private knownVpnPrefixes: string[] = [
    // In a real system, this would be populated from a service or database
    '162.158.',
    '172.70.',
    '103.21.244.',
  ];

  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly securityAuditLogRepository: Repository<SecurityAuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly emailService: EmailService,
    private readonly tokenCacheService: TokenCacheService,
    private readonly deviceManagementService: DeviceManagementService,
  ) {}

  /**
   * Analyze login attempt for fraud risk
   */
  async analyzeLoginAttempt(
    user: User,
    req: Request,
    loginSuccess: boolean,
    geoData?: {
      countryCode?: string;
      countryName?: string;
      city?: string;
      region?: string;
      latitude?: number;
      longitude?: number;
    },
  ): Promise<{
    riskScore: number;
    requiresAdditionalVerification: boolean;
    blockLogin: boolean;
    riskFactors: RiskFactors;
  }> {
    const deviceInfo = this.deviceManagementService.extractDeviceInfo(req);
    const ipAddress = req.ip || 'unknown';

    // Check if device is already trusted
    const isKnownDevice = await this.deviceManagementService.isDeviceTrusted(
      user.id,
      deviceInfo.deviceId,
    );

    // Get historical login data
    const lastLoginIp = user.lastLoginIp;
    const lastLoginCountry = user.lastLoginCountry;

    // Get user's last successful login timestamp
    const lastLoginTime = user.lastLogin;
    const currentTime = new Date();

    // Calculate account age in days
    const accountAgeDays = this.calculateDaysBetween(
      user.createdAt,
      currentTime,
    );

    // Check for rapid location change (impossible travel)
    const rapidLocationChange = await this.detectRapidLocationChange(
      user.id,
      geoData,
      lastLoginTime,
    );

    // Check for unusual login time
    const isUnusualTime = this.isUnusualLoginTime(currentTime, user.id);

    // Detect if IP is likely a VPN or proxy
    const isVpnOrProxy = this.detectVpnOrProxy(ipAddress);

    // Check for high-risk country
    const isHighRiskCountry = geoData?.countryCode
      ? this.highRiskCountries.includes(geoData.countryCode)
      : false;

    // Check for previous suspicious activity
    const hasPreviousSuspiciousActivity =
      await this.hasSuspiciousActivityHistory(user.id);

    // Check for recent brute force attempts
    const hasBruteForceAttempts = await this.hasRecentBruteForceAttempts(
      user.id,
    );

    // Compile risk factors
    const riskFactors: RiskFactors = {
      newDevice: !isKnownDevice,
      locationChange:
        lastLoginCountry && geoData?.countryCode !== lastLoginCountry,
      unusualTime: isUnusualTime,
      unusualIpRange:
        lastLoginIp && !ipAddress.startsWith(lastLoginIp.substring(0, 7)),
      vpnOrProxyDetected: isVpnOrProxy,
      rapidGeoImpossibility: rapidLocationChange,
      bruteForceAttempts: hasBruteForceAttempts,
      accountAgeDays,
      previousSuspiciousActivity: hasPreviousSuspiciousActivity,
      highRiskCountry: isHighRiskCountry,
    };

    // Calculate risk score based on factors (0-100)
    const riskScore = this.calculateRiskScore(riskFactors, loginSuccess);

    // Determine if additional verification is needed based on risk score
    const threshold =
      this.configService.get<number>(
        'security.additionalVerificationThreshold',
      ) || 50;
    const blockThreshold =
      this.configService.get<number>('security.blockLoginThreshold') || 85;

    const requiresAdditionalVerification = riskScore >= threshold;
    const blockLogin = riskScore >= blockThreshold;

    // Log the risk assessment
    await this.securityAuditService.logSecurityEvent({
      userId: user.id,
      eventType: 'fraud_risk_assessment',
      eventSeverity: riskScore > 70 ? 'warning' : 'info',
      message: `Fraud risk assessment score: ${riskScore}`,
      ipAddress,
      deviceInfo: JSON.stringify(deviceInfo),
      location: geoData
        ? `${geoData.city}, ${geoData.region}, ${geoData.countryName}`
        : undefined,
      isSuspicious: riskScore > 70,
      riskScore,
      eventData: { riskFactors },
    });

    // If high risk and login succeeded, notify user
    if (loginSuccess && riskScore > 70) {
      await this.notifyUserAboutSuspiciousLogin(
        user,
        deviceInfo,
        ipAddress,
        geoData,
      );
    }

    return {
      riskScore,
      requiresAdditionalVerification,
      blockLogin,
      riskFactors,
    };
  }

  /**
   * Calculate a risk score based on risk factors
   */
  private calculateRiskScore(
    factors: RiskFactors,
    loginSuccess: boolean,
  ): number {
    let score = 0;

    // Base points for each risk factor
    if (factors.newDevice) score += 20;
    if (factors.locationChange) score += 15;
    if (factors.unusualTime) score += 10;
    if (factors.unusualIpRange) score += 15;
    if (factors.vpnOrProxyDetected) score += 20;
    if (factors.rapidGeoImpossibility) score += 60; // Major red flag
    if (factors.bruteForceAttempts) score += 40;
    if (factors.previousSuspiciousActivity) score += 25;
    if (factors.highRiskCountry) score += 30;

    // Reduce risk for well-established accounts
    if (factors.accountAgeDays > 365) score -= 15;
    else if (factors.accountAgeDays > 180) score -= 10;
    else if (factors.accountAgeDays > 90) score -= 5;
    else if (factors.accountAgeDays < 2) score += 25; // New accounts are higher risk

    // Unsuccessful login increases risk
    if (!loginSuccess) score += 15;

    // Impossible travel is a strong indicator of compromise
    if (factors.rapidGeoImpossibility && factors.newDevice) {
      score += 20; // Additional points for this combination
    }

    // Multiple risk factors compound the risk
    let riskFactorCount = 0;
    Object.values(factors).forEach((value) => {
      if (value === true) riskFactorCount++;
    });

    if (riskFactorCount >= 4) score += 15; // Compounding effect

    // Cap the score at 100
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Detect if a login comes from a location that would be impossible
   * based on the time since the last login (impossible travel)
   */
  private async detectRapidLocationChange(
    userId: string,
    currentGeoData?: {
      latitude?: number;
      longitude?: number;
    },
    lastLoginTime?: Date,
  ): Promise<boolean> {
    if (
      !lastLoginTime ||
      !currentGeoData?.latitude ||
      !currentGeoData?.longitude
    ) {
      return false;
    }

    // Get the user's last login location from security logs
    const lastLoginLog = await this.securityAuditLogRepository.findOne({
      where: {
        userId,
        eventType: 'login_success',
      },
      order: { createdAt: 'DESC' },
    });

    // If no previous login with geo data, can't detect impossible travel
    if (!lastLoginLog || !lastLoginLog.eventData?.geoData) {
      return false;
    }

    const lastGeoData = lastLoginLog.eventData.geoData;

    // Calculate hours since last login
    const hoursSinceLastLogin =
      (new Date().getTime() - lastLoginTime.getTime()) / 1000 / 60 / 60;

    // Calculate distance between login locations
    const distance = this.calculateDistance(
      lastGeoData.latitude,
      lastGeoData.longitude,
      currentGeoData.latitude,
      currentGeoData.longitude,
    );

    // Assume average human travel speed (including flights) of 500 miles per hour as maximum
    // This is a simplification and would be more sophisticated in production
    const maxPossibleDistance = hoursSinceLastLogin * 500;

    return distance > maxPossibleDistance;
  }

  /**
   * Calculate distance between two points on Earth in miles
   * using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 3958.8; // Earth's radius in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Calculate days between two dates
   */
  private calculateDaysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if login time is unusual for the user
   */
  private isUnusualLoginTime(currentTime: Date, userId: string): boolean {
    // In a production system, this would analyze the user's typical login patterns
    // For this example, we'll just use a simple heuristic for demonstration
    const hour = currentTime.getHours();

    // Let's assume logins between 1am and 5am are unusual (simplified)
    // In a real system, this would be based on the user's historical patterns
    return hour >= 1 && hour < 5;
  }

  /**
   * Detect if an IP likely belongs to a VPN or proxy
   */
  private detectVpnOrProxy(ipAddress: string): boolean {
    // In a production system, this would use a more sophisticated approach
    // or a third-party service like MaxMind or IPQualityScore

    // Simplified check for demonstration purposes
    return this.knownVpnPrefixes.some((prefix) => ipAddress.startsWith(prefix));
  }

  /**
   * Check if the user has suspicious activity in their history
   */
  private async hasSuspiciousActivityHistory(userId: string): Promise<boolean> {
    // Check for recent suspicious activity logs
    const suspiciousCount = await this.securityAuditLogRepository.count({
      where: {
        userId,
        isSuspicious: true,
        createdAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
    });

    return suspiciousCount > 0;
  }

  /**
   * Check if there have been recent brute force attempts on this account
   */
  private async hasRecentBruteForceAttempts(userId: string): Promise<boolean> {
    // Look for failed login attempts within the last hour
    const recentFailedLogins = await this.securityAuditLogRepository.count({
      where: {
        userId,
        eventType: 'login_failed',
        createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
    });

    // Consider it a brute force attempt if there are multiple failed logins
    return recentFailedLogins >= 5;
  }

  /**
   * Notify user about suspicious login
   */
  private async notifyUserAboutSuspiciousLogin(
    user: User,
    deviceInfo: any,
    ipAddress: string,
    geoData?: {
      countryCode?: string;
      countryName?: string;
      city?: string;
      region?: string;
    },
  ): Promise<void> {
    // Only send notification if user has opted in (default true)
    if (user.notifyOnUnrecognizedLogin !== false) {
      await this.emailService.sendSecurityAlert(
        user.email,
        'Suspicious Login Detected',
        `We detected a suspicious login to your account:<br><br>
        <strong>Time:</strong> ${new Date().toLocaleString()}<br>
        <strong>Location:</strong> ${geoData ? `${geoData.city}, ${geoData.region}, ${geoData.countryName}` : 'Unknown'}<br>
        <strong>Device:</strong> ${deviceInfo.browserInfo} on ${deviceInfo.operatingSystem}<br>
        <strong>IP Address:</strong> ${ipAddress}<br><br>
        If this wasn't you, please secure your account immediately by changing your password and enabling multi-factor authentication.`,
      );
    }
  }

  /**
   * Handle automated response to detected threats
   */
  async handleThreatResponse(
    userId: string,
    riskScore: number,
    loginAttempt: boolean,
  ): Promise<void> {
    // Different actions based on risk severity
    if (riskScore > 85) {
      // Critical risk - lock account and require identity verification
      await this.lockAccount(userId, 'Suspicious activity detected', 24); // 24 hour lock

      // Get user email for notification
      const user = await this.userRepository.findOne({ where: { id: userId } });

      // Send high-priority security alert
      if (user) {
        await this.emailService.sendSecurityAlert(
          user.email,
          'URGENT: Account Temporarily Locked',
          `Due to highly suspicious activity, we've temporarily locked your account as a security measure. 
          Please contact customer support to verify your identity and regain access to your account.`,
        );
      }
    } else if (riskScore > 70) {
      // High risk - require additional verification but don't lock
      // In a real system, this might trigger stepped-up authentication
      await this.securityAuditService.logSecurityEvent({
        userId,
        eventType: 'stepped_up_auth_required',
        eventSeverity: 'warning',
        message: 'Stepped-up authentication required due to high risk score',
        riskScore,
      });

      // Mark this session as requiring additional verification
      if (loginAttempt) {
        await this.tokenCacheService.markSessionForSteppedUpAuth(userId);
      }
    } else if (riskScore > 50) {
      // Medium risk - monitor but allow with verification
      await this.securityAuditService.logSecurityEvent({
        userId,
        eventType: 'account_flagged_for_monitoring',
        eventSeverity: 'info',
        message:
          'Account flagged for additional monitoring due to medium risk score',
        riskScore,
      });
    }
    // Low risk - normal authentication flow
  }

  /**
   * Lock a user account for security reasons
   */
  private async lockAccount(
    userId: string,
    reason: string,
    hours: number,
  ): Promise<boolean> {
    try {
      // Calculate lock expiry time
      const lockUntil = new Date();
      lockUntil.setHours(lockUntil.getHours() + hours);

      // Update user record with lock
      await this.userRepository.update(userId, {
        lockUntil,
      });

      // Log the account lock
      await this.securityAuditService.logSecurityEvent({
        userId,
        eventType: 'account_locked',
        eventSeverity: 'warning',
        message: `Account locked: ${reason}`,
        eventData: { lockDurationHours: hours },
      });

      return true;
    } catch (error) {
      console.error('Failed to lock account:', error);
      return false;
    }
  }

  /**
   * Check if a specific geographic location is allowed for this user
   * based on their security preferences
   */
  async isLocationAllowed(
    userId: string,
    countryCode?: string,
  ): Promise<boolean> {
    // If no country code provided, allow (can't check)
    if (!countryCode) {
      return true;
    }

    // Get user preferences
    const user = await this.userRepository.findOne({ where: { id: userId } });

    // If user has country restrictions enabled and has allowed countries list
    if (user?.restrictLoginByCountry && user?.allowedCountries?.length) {
      return user.allowedCountries.includes(countryCode);
    }

    return true; // No restriction
  }
}
