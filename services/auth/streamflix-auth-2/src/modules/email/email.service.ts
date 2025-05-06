import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send verification email to user
   * In a real implementation, this would connect to an email service provider
   */
  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const appUrl =
      this.configService.get<string>('app.url') || 'http://localhost:3000';
    const verificationUrl = `${appUrl}/api/auth/verify-email/${token}`;

    // In development, just log the verification URL
    this.logger.log(
      `📧 Email Verification Link [DEV MODE]: ${verificationUrl}`,
    );

    // In production, this would send an actual email
    // return await this.sendEmail({
    //   to: email,
    //   subject: 'Verify your Streamflix account',
    //   html: `Please verify your account by clicking <a href="${verificationUrl}">here</a>`,
    // });

    return true;
  }

  /**
   * Send password reset email to user
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const appUrl =
      this.configService.get<string>('app.url') || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // In development, just log the reset URL
    this.logger.log(`📧 Password Reset Link [DEV MODE]: ${resetUrl}`);

    // In production, this would send an actual email
    return true;
  }

  /**
   * Send account activated email
   */
  async sendAccountActivatedEmail(email: string): Promise<boolean> {
    this.logger.log(
      `📧 Account Activated Email [DEV MODE] would be sent to: ${email}`,
    );

    // In production, this would send an actual email
    return true;
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string): Promise<boolean> {
    this.logger.log(`📧 Welcome Email [DEV MODE] would be sent to: ${email}`);

    // In production, this would send an actual email
    return true;
  }

  /**
   * Send security alert email to user
   */
  async sendSecurityAlert(
    email: string,
    subject: string,
    message: string,
  ): Promise<boolean> {
    this.logger.log(
      `📧 Security Alert Email [DEV MODE] would be sent to: ${email}`,
    );
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Message: ${message}`);

    // In production, this would send an actual email with high priority flag
    return true;
  }
}
