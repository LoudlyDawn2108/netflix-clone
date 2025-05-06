import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Redirect,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { UsersService } from '../users/users.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  Throttle,
  ThrottleByIp,
} from '../../common/decorators/throttle.decorator';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { OAuthService } from './services/oauth.service';
import { PassportModule } from '@nestjs/passport';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { MfaService } from './services/mfa.service';
import { DeviceManagementService } from './services/device-management.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { IpSecurityService } from './services/ip-security.service';
import { SecurityAuditService } from './services/security-audit.service';
import { MfaInitDto } from './dto/mfa-init.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { MfaValidateDto } from './dto/mfa-validate.dto';
import {
  DeviceRegistrationDto,
  DeviceUpdateDto,
  DeviceVerificationDto,
} from './dto/device-management.dto';
import {
  GlobalIpBlacklistDto,
  IpBlacklistDto,
  IpWhitelistDto,
} from './dto/ip-security.dto';
import {
  SecurityAuditExportDto,
  SecurityAuditFilterDto,
} from './dto/security-audit.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private oauthService: OAuthService,
    private configService: ConfigService,
    private mfaService: MfaService,
    private deviceManagementService: DeviceManagementService,
    private fraudDetectionService: FraudDetectionService,
    private ipSecurityService: IpSecurityService,
    private securityAuditService: SecurityAuditService,
  ) {}

  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged in, returns JWT tokens',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(5, 60) // Limit to 5 attempts per minute
  @ThrottleByIp() // Use IP-based tracking for login attempts
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user, req);
  }

  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'User successfully registered and logged in, returns JWT tokens',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  @Post('register')
  @Throttle(3, 300) // Limit to 3 registrations per 5 minutes to prevent abuse
  @ThrottleByIp()
  async register(@Body() registerDto: RegisterDto, @Request() req) {
    return this.authService.register(registerDto, req);
  }

  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged out',
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetUser() user: User,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.logout(user.id, refreshToken);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access token generated',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(10, 60) // Limit refresh token requests
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req,
  ) {
    return this.authService.refreshTokens(refreshTokenDto, req);
  }

  @ApiOperation({ summary: 'Change password for logged-in user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid current password or invalid password format',
  })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(5, 300) // Limit password change attempts
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    return this.authService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
      req,
    );
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns current user profile',
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@GetUser() user: User) {
    // Remove sensitive data
    return this.authService.sanitizeUser(user);
  }

  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email successfully verified',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid verification token',
  })
  @ApiParam({ name: 'token', description: 'Email verification token' })
  @Get('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent',
  })
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @Throttle(3, 600) // Limit to 3 password reset requests per 10 minutes
  @ThrottleByIp()
  async requestPasswordReset(
    @Body() dto: ResetPasswordRequestDto,
    @Request() req,
  ) {
    return this.authService.requestPasswordReset(dto.email, req);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successful',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired reset token',
  })
  @Post('password-reset/complete')
  @HttpCode(HttpStatus.OK)
  @Throttle(3, 300) // Limit password reset attempts
  @ThrottleByIp()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of active sessions',
  })
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@GetUser() user: User) {
    return this.authService.getActiveSessions(user.id);
  }

  @ApiOperation({ summary: 'Force logout from all devices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged out from all devices',
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout/all')
  @HttpCode(HttpStatus.OK)
  async forceLogoutAll(@GetUser() user: User) {
    return this.authService.forceLogout(user.id);
  }

  // OAuth Authentication Routes

  @ApiOperation({ summary: 'Initiate Google OAuth login flow' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to Google authentication page',
  })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  initiateGoogleAuth() {
    // The guard will redirect to Google, so this function won't be executed
    return { message: 'Redirecting to Google authentication...' };
  }

  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns auth tokens after successful Google authentication',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid OAuth callback data',
  })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req, @Query() query: OAuthCallbackDto) {
    // The guard has already validated the OAuth data
    const frontendUrl =
      this.configService.get<string>('oauth.redirectAfterLoginUrl') ||
      'http://localhost:3000';

    // If user is linking an account
    if (req.user.linkUserId) {
      return {
        success: true,
        message: 'Google account linked successfully',
        provider: 'google',
        identity: req.user.identity,
      };
    }

    // For normal login/signup flow
    const tokens = await this.authService.login(req.user.user, req);

    // In a real app, you'd redirect to the frontend with the tokens or session
    return {
      message: req.user.isNewUser
        ? 'Successfully registered with Google'
        : 'Successfully logged in with Google',
      ...tokens,
    };
  }

  @ApiOperation({ summary: 'Initiate GitHub OAuth login flow' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to GitHub authentication page',
  })
  @Get('github')
  @UseGuards(AuthGuard('github'))
  initiateGitHubAuth() {
    // The guard will redirect to GitHub, so this function won't be executed
    return { message: 'Redirecting to GitHub authentication...' };
  }

  @ApiOperation({ summary: 'Handle GitHub OAuth callback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns auth tokens after successful GitHub authentication',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid OAuth callback data',
  })
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Request() req, @Query() query: OAuthCallbackDto) {
    // The guard has already validated the OAuth data
    const frontendUrl =
      this.configService.get<string>('oauth.redirectAfterLoginUrl') ||
      'http://localhost:3000';

    // If user is linking an account
    if (req.user.linkUserId) {
      return {
        success: true,
        message: 'GitHub account linked successfully',
        provider: 'github',
        identity: req.user.identity,
      };
    }

    // For normal login/signup flow
    const tokens = await this.authService.login(req.user.user, req);

    return {
      message: req.user.isNewUser
        ? 'Successfully registered with GitHub'
        : 'Successfully logged in with GitHub',
      ...tokens,
    };
  }

  @ApiOperation({ summary: 'Link OAuth provider to existing account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns link URL for the specified OAuth provider',
  })
  @UseGuards(JwtAuthGuard)
  @Get('link/:provider')
  async linkOAuthAccount(
    @GetUser() user: User,
    @Param('provider') provider: string,
  ) {
    // Validate provider
    if (!['google', 'github'].includes(provider)) {
      return {
        success: false,
        message: 'Invalid provider. Supported providers: google, github',
      };
    }

    // Generate state parameter for CSRF protection
    const state = await this.oauthService.generateState(user.id);

    // Generate the OAuth URL
    const baseUrl = this.configService.get<string>('oauth.baseCallbackUrl');
    const authUrl = `${baseUrl}/${provider}?state=${state}`;

    return {
      success: true,
      linkUrl: authUrl,
    };
  }

  @ApiOperation({ summary: 'Unlink OAuth provider from account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OAuth provider unlinked successfully',
  })
  @UseGuards(JwtAuthGuard)
  @Post('unlink/:provider')
  async unlinkOAuthAccount(
    @GetUser() user: User,
    @Param('provider') provider: string,
  ) {
    try {
      await this.oauthService.unlinkAccount(user.id, provider);
      return {
        success: true,
        message: `Successfully unlinked ${provider} account`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'List linked OAuth providers for user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of linked OAuth identities',
  })
  @UseGuards(JwtAuthGuard)
  @Get('linked-accounts')
  async getLinkedAccounts(@GetUser() user: User) {
    const identities = await this.oauthService.getUserIdentities(user.id);

    return {
      success: true,
      identities: identities.map((identity) => ({
        provider: identity.provider,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl,
        createdAt: identity.createdAt,
        lastLogin: identity.lastLogin,
      })),
    };
  }

  // MFA Endpoints

  @ApiOperation({ summary: 'Initialize MFA setup' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns secret key and QR code URL for TOTP setup',
  })
  @UseGuards(JwtAuthGuard)
  @Post('mfa/init')
  @HttpCode(HttpStatus.OK)
  async initMfaSetup(@GetUser() user: User, @Body() mfaInitDto: MfaInitDto) {
    if (mfaInitDto.mfaType === 'sms' && !mfaInitDto.phoneNumber) {
      return {
        success: false,
        message: 'Phone number is required for SMS MFA',
      };
    }

    const result = await this.mfaService.generateTotpSecret(user.id);
    return {
      success: true,
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
      mfaType: mfaInitDto.mfaType,
    };
  }

  @ApiOperation({ summary: 'Verify and enable MFA' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA enabled successfully, returns backup codes',
  })
  @UseGuards(JwtAuthGuard)
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyAndEnableMfa(
    @GetUser() user: User,
    @Body() mfaVerifyDto: MfaVerifyDto,
    @Body() mfaInitDto: MfaInitDto,
  ) {
    const result = await this.mfaService.verifyAndEnableMfa(
      user.id,
      mfaVerifyDto.code,
      mfaInitDto.mfaType,
      mfaInitDto.phoneNumber,
    );

    return {
      success: result.success,
      backupCodes: result.backupCodes,
      message: 'MFA enabled successfully. Please save your backup codes.',
    };
  }

  @ApiOperation({ summary: 'Validate MFA token during login' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA validated successfully, returns auth tokens',
  })
  @Post('mfa/validate')
  @HttpCode(HttpStatus.OK)
  @Throttle(5, 60) // Limit to 5 attempts per minute
  async validateMfa(@Body() mfaValidateDto: MfaValidateDto, @Request() req) {
    const isValid = await this.mfaService.verifyMfaToken(
      mfaValidateDto.userId,
      mfaValidateDto.code,
    );

    if (!isValid) {
      return {
        success: false,
        message: 'Invalid MFA code',
      };
    }

    // Get user and generate tokens
    const user = await this.usersService.findById(mfaValidateDto.userId);
    const tokens = await this.authService.login(user, req);

    return {
      success: true,
      ...tokens,
      message: 'MFA verified successfully',
    };
  }

  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA disabled successfully',
  })
  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  async disableMfa(@GetUser() user: User) {
    const result = await this.mfaService.disableMfa(user.id);
    return {
      success: result,
      message: result ? 'MFA disabled successfully' : 'Failed to disable MFA',
    };
  }

  @ApiOperation({ summary: 'Regenerate MFA backup codes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA backup codes regenerated',
  })
  @UseGuards(JwtAuthGuard)
  @Post('mfa/backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(@GetUser() user: User) {
    const backupCodes = await this.mfaService.regenerateBackupCodes(user.id);
    return {
      success: true,
      backupCodes,
      message: 'Backup codes regenerated successfully',
    };
  }

  @ApiOperation({ summary: 'Check MFA status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns MFA status',
  })
  @UseGuards(JwtAuthGuard)
  @Get('mfa/status')
  async getMfaStatus(@GetUser() user: User) {
    const remainingCodes = await this.mfaService.getRemainingBackupCodes(
      user.id,
    );
    return {
      success: true,
      enabled: user.mfaEnabled,
      type: user.mfaType,
      backupCodes: {
        used: remainingCodes.used,
        unused: remainingCodes.unused,
      },
    };
  }

  // Device Management Endpoints

  @ApiOperation({ summary: 'Get all trusted devices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of trusted devices',
  })
  @UseGuards(JwtAuthGuard)
  @Get('devices')
  async getUserDevices(@GetUser() user: User) {
    const devices = await this.deviceManagementService.getUserDevices(user.id);
    return {
      success: true,
      devices: devices.map((device) => ({
        id: device.id,
        name: device.name,
        deviceType: device.deviceType,
        browserInfo: device.browserInfo,
        operatingSystem: device.operatingSystem,
        lastUsedAt: device.lastUsedAt,
        location: device.location,
        trustLevel: device.trustLevel,
        isActive: device.isActive,
      })),
    };
  }

  @ApiOperation({ summary: 'Update device name or trust level' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device updated successfully',
  })
  @UseGuards(JwtAuthGuard)
  @Patch('devices/:deviceId')
  @HttpCode(HttpStatus.OK)
  async updateDevice(
    @GetUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() deviceUpdateDto: DeviceUpdateDto,
  ) {
    if (deviceUpdateDto.name) {
      await this.deviceManagementService.renameDevice(
        user.id,
        deviceId,
        deviceUpdateDto.name,
      );
    }

    if (deviceUpdateDto.trustLevel) {
      await this.deviceManagementService.updateDeviceTrustLevel(
        user.id,
        deviceId,
        deviceUpdateDto.trustLevel,
      );
    }

    return {
      success: true,
      message: 'Device updated successfully',
    };
  }

  @ApiOperation({ summary: 'Revoke device' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device revoked successfully',
  })
  @UseGuards(JwtAuthGuard)
  @Delete('devices/:deviceId')
  @HttpCode(HttpStatus.OK)
  async revokeDevice(
    @GetUser() user: User,
    @Param('deviceId') deviceId: string,
  ) {
    const result = await this.deviceManagementService.revokeDevice(
      user.id,
      deviceId,
    );
    return {
      success: result,
      message: result
        ? 'Device revoked successfully'
        : 'Failed to revoke device',
    };
  }

  @ApiOperation({ summary: 'Verify new device using a token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device verified successfully',
  })
  @Post('devices/verify')
  @HttpCode(HttpStatus.OK)
  async verifyDevice(@Body() deviceVerificationDto: DeviceVerificationDto) {
    const result = await this.deviceManagementService.verifyDeviceWithToken(
      deviceVerificationDto.token,
    );

    return {
      success: result,
      message: result
        ? 'Device verified successfully'
        : 'Failed to verify device',
    };
  }

  // IP Security Endpoints

  @ApiOperation({ summary: 'Get IP security settings for user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns IP whitelist and blacklist',
  })
  @UseGuards(JwtAuthGuard)
  @Get('ip-security')
  async getIpSecuritySettings(@GetUser() user: User) {
    const settings = await this.ipSecurityService.getUserIpSecuritySettings(
      user.id,
    );

    const whitelist = settings.filter((entry) => entry.type === 'whitelist');
    const blacklist = settings.filter((entry) => entry.type === 'blacklist');

    return {
      success: true,
      whitelist,
      blacklist,
    };
  }

  @ApiOperation({ summary: 'Add IP to whitelist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'IP added to whitelist',
  })
  @UseGuards(JwtAuthGuard)
  @Post('ip-security/whitelist')
  @HttpCode(HttpStatus.OK)
  async addIpToWhitelist(
    @GetUser() user: User,
    @Body() ipWhitelistDto: IpWhitelistDto,
  ) {
    const result = await this.ipSecurityService.addIpToWhitelist(
      user.id,
      ipWhitelistDto.ipAddress,
    );

    return {
      success: true,
      message: 'IP address added to whitelist',
      entry: result,
    };
  }

  @ApiOperation({ summary: 'Add IP to blacklist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'IP added to blacklist',
  })
  @UseGuards(JwtAuthGuard)
  @Post('ip-security/blacklist')
  @HttpCode(HttpStatus.OK)
  async addIpToBlacklist(
    @GetUser() user: User,
    @Body() ipBlacklistDto: IpBlacklistDto,
  ) {
    const result = await this.ipSecurityService.addIpToBlacklist(
      user.id,
      ipBlacklistDto.ipAddress,
      ipBlacklistDto.reason,
    );

    return {
      success: true,
      message: 'IP address added to blacklist',
      entry: result,
    };
  }

  @ApiOperation({
    summary: 'Remove IP from security list (whitelist or blacklist)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'IP removed from security list',
  })
  @UseGuards(JwtAuthGuard)
  @Delete('ip-security/:ipAddress')
  @HttpCode(HttpStatus.OK)
  async removeIpFromSecurityList(
    @GetUser() user: User,
    @Param('ipAddress') ipAddress: string,
  ) {
    const result = await this.ipSecurityService.removeIpRestriction(
      user.id,
      ipAddress,
    );

    return {
      success: result,
      message: result
        ? 'IP security restriction removed'
        : 'Failed to remove IP restriction',
    };
  }

  // Admin-only IP security controls
  @ApiOperation({ summary: 'Add IP to global blacklist (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'IP added to global blacklist',
  })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/ip-security/blacklist')
  @HttpCode(HttpStatus.OK)
  async addIpToGlobalBlacklist(
    @GetUser() user: User,
    @Body() globalIpBlacklistDto: GlobalIpBlacklistDto,
  ) {
    const expiresAt = globalIpBlacklistDto.expiresAt
      ? new Date(globalIpBlacklistDto.expiresAt)
      : undefined;

    const result = await this.ipSecurityService.addIpToGlobalBlacklist(
      globalIpBlacklistDto.ipAddress,
      globalIpBlacklistDto.reason,
      user.id,
      undefined, // geoData will be empty here
      expiresAt,
    );

    return {
      success: true,
      message: 'IP address added to global blacklist',
      entry: result,
    };
  }

  // Security Audit Endpoints

  @ApiOperation({ summary: 'Get security audit logs for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated security audit logs',
  })
  @UseGuards(JwtAuthGuard)
  @Get('security/audit-logs')
  async getSecurityLogs(
    @GetUser() user: User,
    @Query() filterDto: SecurityAuditFilterDto,
  ) {
    const fromDate = filterDto.fromDate
      ? new Date(filterDto.fromDate)
      : undefined;
    const toDate = filterDto.toDate ? new Date(filterDto.toDate) : undefined;

    const result = await this.securityAuditService.getUserSecurityLogs(
      user.id,
      {
        page: filterDto.page,
        limit: filterDto.limit,
        eventTypes: filterDto.eventTypes,
        severities: filterDto.severities,
        fromDate,
        toDate,
        sortBy: filterDto.sortBy,
        sortOrder: filterDto.sortOrder,
      },
    );

    return {
      success: true,
      logs: result.logs,
      total: result.total,
      page: filterDto.page || 1,
      limit: filterDto.limit || 10,
    };
  }

  @ApiOperation({ summary: 'Export security audit logs (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns downloadable security audit logs',
  })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/security/export-logs')
  @HttpCode(HttpStatus.OK)
  async exportSecurityLogs(@Body() exportDto: SecurityAuditExportDto) {
    const fromDate = exportDto.fromDate
      ? new Date(exportDto.fromDate)
      : undefined;
    const toDate = exportDto.toDate ? new Date(exportDto.toDate) : undefined;

    const logs = await this.securityAuditService.exportSecurityLogs({
      userId: undefined, // Admin can export any logs
      ipAddress: exportDto.ipAddress,
      eventTypes: exportDto.eventTypes,
      fromDate,
      toDate,
      isSuspicious: exportDto.isSuspicious,
      minRiskScore: exportDto.minRiskScore,
    });

    return {
      success: true,
      logs,
      count: logs.length,
      exportDate: new Date(),
    };
  }

  @ApiOperation({ summary: 'Get suspicious activities (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of suspicious activities',
  })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/security/suspicious-activities')
  async getSuspiciousActivities(@Query() filterDto: SecurityAuditFilterDto) {
    const fromDate = filterDto.fromDate
      ? new Date(filterDto.fromDate)
      : undefined;
    const toDate = filterDto.toDate ? new Date(filterDto.toDate) : undefined;

    const result = await this.securityAuditService.getSuspiciousActivityLogs({
      page: filterDto.page,
      limit: filterDto.limit,
      fromDate,
      toDate,
    });

    return {
      success: true,
      activities: result.logs,
      total: result.total,
      page: filterDto.page || 1,
      limit: filterDto.limit || 10,
    };
  }

  @ApiOperation({ summary: 'Verify log chain integrity (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns integrity verification results',
  })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/security/verify-log-integrity')
  async verifyLogIntegrity() {
    const result = await this.securityAuditService.verifyLogChainIntegrity();

    return {
      success: true,
      valid: result.valid,
      invalidLogs: result.invalidLogs,
      verificationDate: new Date(),
    };
  }
}
