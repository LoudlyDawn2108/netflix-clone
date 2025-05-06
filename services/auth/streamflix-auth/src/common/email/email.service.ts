import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  attachments?: any[];
  cc?: string[];
  bcc?: string[];
}

export interface VerificationEmailContext {
  name?: string;
  verificationUrl: string;
  expiryHours: number;
  logoUrl?: string;
  supportEmail: string;
}

/**
 * Service for sending emails with template support
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly templates: Map<string, HandlebarsTemplateDelegate> =
    new Map();

  // Branding settings from config
  private readonly serviceName: string;
  private readonly companyName: string;
  private readonly companyAddress: string;
  private readonly supportEmail: string;
  private readonly logoUrl?: string;
  private readonly primaryColor: string;
  private readonly verificationBaseUrl: string;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    // Load email branding configuration
    this.serviceName = this.configService.get<string>(
      'EMAIL_SERVICE_NAME',
      'StreamFlix',
    );
    this.companyName = this.configService.get<string>(
      'EMAIL_COMPANY_NAME',
      'StreamFlix Inc.',
    );
    this.companyAddress = this.configService.get<string>(
      'EMAIL_COMPANY_ADDRESS',
      '',
    );
    this.supportEmail = this.configService.get<string>(
      'EMAIL_SUPPORT',
      'support@example.com',
    );
    this.logoUrl = this.configService.get<string>('EMAIL_LOGO_URL');
    this.primaryColor = this.configService.get<string>(
      'EMAIL_PRIMARY_COLOR',
      '#e50914',
    ); // Netflix red default
    this.verificationBaseUrl = this.configService.get<string>(
      'EMAIL_VERIFICATION_URL',
      'http://localhost:3000/auth/verify',
    );
    this.fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      `"${this.serviceName}" <no-reply@example.com>`,
    );

    // Load email templates
    this.preloadTemplates();

    // Initialize email transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production SMTP setup
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('EMAIL_SMTP_HOST'),
        port: this.configService.get<number>('EMAIL_SMTP_PORT'),
        secure: this.configService.get<boolean>('EMAIL_SMTP_SECURE', true),
        auth: {
          user: this.configService.get<string>('EMAIL_SMTP_USER'),
          pass: this.configService.get<string>('EMAIL_SMTP_PASSWORD'),
        },
      });
    } else {
      // Development mode uses ethereal.email
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.configService.get<string>(
            'DEV_EMAIL_USER',
            'ethereal_user',
          ),
          pass: this.configService.get<string>(
            'DEV_EMAIL_PASSWORD',
            'ethereal_password',
          ),
        },
      });
    }

    // Verify connection
    this.verifyConnection();
  }

  /**
   * Verify connection to email server
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('Email server connection established successfully');
    } catch (error) {
      this.logger.error(
        `Failed to establish email server connection: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Preload and compile email templates
   */
  private preloadTemplates(): void {
    try {
      const templatesDir = path.join(__dirname, 'templates');

      // Load verification email template
      const verificationTemplate = fs.readFileSync(
        path.join(templatesDir, 'verification-email.template.html'),
        'utf8',
      );

      // Compile with Handlebars
      this.templates.set(
        'verification',
        Handlebars.compile(verificationTemplate),
      );

      this.logger.log('Email templates preloaded successfully');
    } catch (error) {
      this.logger.error(
        `Failed to load email templates: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Send a verification email with the given token
   * @param email Recipient email address
   * @param token Verification token
   * @param name Optional user's name
   * @returns Promise resolving to send result
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    name?: string,
  ): Promise<boolean> {
    try {
      const verificationUrl = `${this.verificationBaseUrl}?token=${token}`;
      const expiryHours = this.configService.get<number>(
        'VERIFICATION_TOKEN_EXPIRY_HOURS',
        24,
      );

      // Template context
      const context: Record<string, any> = {
        name,
        verificationUrl,
        expiryHours,
        supportEmail: this.supportEmail,
        serviceName: this.serviceName,
        companyName: this.companyName,
        companyAddress: this.companyAddress,
        logoUrl: this.logoUrl,
        primaryColor: this.primaryColor,
        currentYear: new Date().getFullYear(),
      };

      // Render template
      const template = this.templates.get('verification');
      if (!template) {
        throw new Error('Verification email template not found');
      }

      const html = template(context);

      // Create plain text version
      const text = this.generatePlainTextFromHtml(html);

      // Send the email
      const result = await this.send({
        to: email,
        subject: `${this.serviceName} - Please verify your email`,
        html,
        text,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send an email
   * @param options Email options
   * @returns Promise resolving to boolean indicating success
   */
  async send(options: EmailOptions): Promise<boolean> {
    try {
      const emailOptions = {
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(emailOptions);

      // For development, log preview URL from Ethereal
      if (process.env.NODE_ENV !== 'production' && info.messageId) {
        this.logger.debug(
          `Email preview URL: ${nodemailer.getTestMessageUrl(info)}`,
        );
      }

      this.logger.debug(`Email sent to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Generate a plain text version from HTML content
   * @param html HTML content
   * @returns Plain text version
   */
  private generatePlainTextFromHtml(html: string): string {
    // Very simple HTML to text conversion - in a real app you'd use a library
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
