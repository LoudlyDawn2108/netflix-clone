import {
  Injectable,
  PipeTransform,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../database/entities/user.entity';

/**
 * A validation pipe that checks if an email is already registered
 * This pipe extracts the email from the request body and checks if it's unique
 * Implements case-insensitive validation and domain restrictions if configured
 */
@Injectable()
export class EmailUniquePipe implements PipeTransform {
  private readonly logger = new Logger(EmailUniquePipe.name);
  private readonly disallowedDomains: string[] = [];
  private readonly allowedDomains: string[] = [];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    // Initialize disallowed and allowed domains from config
    this.disallowedDomains = this.configService
      .get<string>('EMAIL_DISALLOWED_DOMAINS', '')
      .split(',')
      .filter((domain) => domain.trim())
      .map((domain) => domain.toLowerCase().trim());

    this.allowedDomains = this.configService
      .get<string>('EMAIL_ALLOWED_DOMAINS', '')
      .split(',')
      .filter((domain) => domain.trim())
      .map((domain) => domain.toLowerCase().trim());

    this.logger.log(
      `Email validation initialized with ${this.disallowedDomains.length} disallowed domains and ${this.allowedDomains.length} allowed domains`,
    );
  }

  /**
   * Transform method required by PipeTransform interface
   * @param value - The value passed to the pipe (request body)
   * @returns The unchanged value if validation passes
   * @throws BadRequestException if the email is already registered or invalid
   */
  async transform(value: any): Promise<any> {
    // Skip validation if email is not provided
    if (!value.email) {
      return value;
    }

    const email = value.email.toLowerCase().trim();

    // Validate email format (additional check beyond class-validator)
    if (!this.isValidEmailFormat(email)) {
      throw new BadRequestException('Invalid email format.');
    }

    // Validate against domain restrictions
    this.validateEmailDomain(email);

    try {
      // Proper case-insensitive search using TypeORM's ILike operator for PostgreSQL
      const existingUser = await this.userRepository.findOne({
        where: { email: ILike(email) },
      });

      // Throw an exception if the email is already registered
      if (existingUser) {
        this.logger.warn(`Registration attempt with existing email: ${email}`);
        throw new BadRequestException(
          'Email already registered. Please use a different email or try to login.',
        );
      }
    } catch (error) {
      // Only rethrow BadRequestException, handle other errors
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error checking email uniqueness: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Unable to validate email. Please try again later.',
      );
    }

    // Normalize the email to lowercase in the value object
    value.email = email;

    // Return the value with normalized email if validation passes
    return value;
  }

  /**
   * Validates the format of an email address
   * @param email - The email to validate
   * @returns boolean indicating if the format is valid
   */
  private isValidEmailFormat(email: string): boolean {
    // RFC 5322 compliant email regex
    // This is more thorough than the basic validation in class-validator
    const emailRegex =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
  }

  /**
   * Validates that the email domain is allowed and not disallowed
   * @param email - The email to validate
   * @throws BadRequestException if the domain is disallowed or not in allowed list
   */
  private validateEmailDomain(email: string): void {
    const domain = email.split('@')[1]?.toLowerCase();

    if (!domain) {
      throw new BadRequestException('Invalid email format: missing domain.');
    }

    // Check against disallowed domains (like disposable email domains)
    if (
      this.disallowedDomains.length > 0 &&
      this.disallowedDomains.some((disallowed) => domain.endsWith(disallowed))
    ) {
      this.logger.warn(
        `Registration attempt with disallowed domain: ${domain}`,
      );
      throw new BadRequestException(
        'Email domain not accepted. Please use a different email provider.',
      );
    }

    // If allowed domains are specified, ensure the domain is in the list
    if (
      this.allowedDomains.length > 0 &&
      !this.allowedDomains.some((allowed) => domain.endsWith(allowed))
    ) {
      this.logger.warn(
        `Registration attempt with non-allowed domain: ${domain}`,
      );
      throw new BadRequestException(
        'Email domain not supported. Please use an email from an approved provider.',
      );
    }
  }
}
