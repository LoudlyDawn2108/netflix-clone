import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as zxcvbn from 'zxcvbn';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pwnedPassword } from 'hibp';

// Common password patterns to check against
const COMMON_PATTERNS = [
  /^password\d*$/i,
  /^pass\d*$/i,
  /^admin\d*$/i,
  /^qwerty\d*$/i,
  /^letmein\d*$/i,
  /^welcome\d*$/i,
  /^123\d*$/,
  /^abc\d*$/i,
  /^test\d*$/i,
  /^[a-z]+\d{1,4}$/i, // Simple word followed by digits
  /^[a-z]{1,5}$/, // Very short word
];

// 1,000 most common passwords list
const COMMON_PASSWORDS = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'admin',
  'welcome',
  'monkey',
  'football',
  'letmein',
  '111111',
  // ... more would be added from an actual common passwords list
];

export interface PasswordStrengthFeedback {
  score: number;
  feedback: string[];
  warning?: string;
  suggestions: string[];
  hasBeenBreached?: boolean;
  isCommonPassword?: boolean;
  hasCommonPattern?: boolean;
  missingRequirements: string[];
}

@ValidatorConstraint({ name: 'passwordStrength', async: true })
@Injectable()
export class PasswordStrengthConstraint
  implements ValidatorConstraintInterface
{
  private readonly logger = new Logger(PasswordStrengthConstraint.name);
  private readonly minLength: number;
  private readonly maxLength: number;
  private readonly requiredScore: number;
  private readonly checkHibp: boolean;

  constructor(private readonly configService: ConfigService) {
    this.minLength = this.configService.get<number>('PASSWORD_MIN_LENGTH', 12);
    this.maxLength = this.configService.get<number>('PASSWORD_MAX_LENGTH', 128);
    this.requiredScore = this.configService.get<number>(
      'PASSWORD_MIN_SCORE',
      3,
    );
    this.checkHibp = this.configService.get<boolean>(
      'PASSWORD_CHECK_HIBP',
      true,
    );
  }

  async validate(
    password: string,
    args: ValidationArguments,
  ): Promise<boolean> {
    try {
      if (!password) return false;

      const dto = args.object as any;
      const strength = await this.analyzePassword(password, dto);

      // Attach the analysis to the object for use in error messages
      (args.object as any).__passwordStrength = strength;

      // Password must meet minimum requirements (score + all validation rules pass)
      return (
        strength.score >= this.requiredScore &&
        strength.missingRequirements.length === 0 &&
        !strength.isCommonPassword &&
        !strength.hasCommonPattern &&
        !strength.hasBeenBreached
      );
    } catch (error) {
      this.logger.error(
        `Password validation error: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async analyzePassword(
    password: string,
    dto?: any,
  ): Promise<PasswordStrengthFeedback> {
    const missingRequirements: string[] = [];
    const feedback: string[] = []; // Explicitly type as string[]

    // Check for minimum length
    if (password.length < this.minLength) {
      missingRequirements.push(`minimum length (${this.minLength} characters)`);
      feedback.push(
        `Password must be at least ${this.minLength} characters long`,
      );
    }

    // Check for maximum length
    if (password.length > this.maxLength) {
      missingRequirements.push(`maximum length (${this.maxLength} characters)`);
      feedback.push(`Password cannot exceed ${this.maxLength} characters`);
    }

    // Check for uppercase
    if (!/[A-Z]/.test(password)) {
      missingRequirements.push('uppercase letter');
      feedback.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase
    if (!/[a-z]/.test(password)) {
      missingRequirements.push('lowercase letter');
      feedback.push('Password must contain at least one lowercase letter');
    }

    // Check for number
    if (!/\d/.test(password)) {
      missingRequirements.push('number');
      feedback.push('Password must contain at least one number');
    }

    // Check for special characters
    if (!/[^A-Za-z0-9]/.test(password)) {
      missingRequirements.push('special character');
      feedback.push('Password must contain at least one special character');
    }

    // Check for personal information
    const personalInfo = this.extractPersonalInfo(dto);
    const containsPersonalInfo = this.checkPersonalInfo(password, personalInfo);
    if (containsPersonalInfo) {
      missingRequirements.push('no personal information');
      feedback.push('Password should not contain your personal information');
    }

    // Check for common passwords
    const isCommonPassword = COMMON_PASSWORDS.includes(password.toLowerCase());
    if (isCommonPassword) {
      feedback.push('This is a commonly used password and is not secure');
    }

    // Check for common patterns
    const hasCommonPattern = COMMON_PATTERNS.some((pattern) =>
      pattern.test(password),
    );
    if (hasCommonPattern) {
      feedback.push('This password follows a common pattern and is not secure');
    }

    // Use zxcvbn for comprehensive password analysis
    const zxcvbnResult = zxcvbn(password, personalInfo);
    const score = zxcvbnResult.score; // 0-4, where 4 is strongest

    // Add zxcvbn feedback
    const suggestions = [...(zxcvbnResult.feedback.suggestions || [])];
    if (zxcvbnResult.feedback.warning) {
      feedback.push(zxcvbnResult.feedback.warning);
    }

    // Add general feedback based on score
    if (score < 3 && !feedback.length) {
      feedback.push(
        'This password is too weak. Try making it longer or adding symbols.',
      );
    }

    // Check if password has been breached (check Have I Been Pwned API)
    let hasBeenBreached = false;
    if (this.checkHibp) {
      try {
        const breachedCount = await pwnedPassword(password);
        hasBeenBreached = breachedCount > 0;
        if (hasBeenBreached) {
          feedback.push(
            `This password has been found in ${breachedCount.toLocaleString()} data breaches. Please choose a different password.`,
          );
          missingRequirements.push('not previously breached');
        }
      } catch (error) {
        this.logger.warn(
          'Unable to check password against HIBP API: ' + error.message,
        );
        // Don't block validation if HIBP check fails
      }
    }

    return {
      score,
      feedback,
      suggestions,
      isCommonPassword,
      hasCommonPattern,
      hasBeenBreached,
      warning: zxcvbnResult.feedback.warning,
      missingRequirements,
    };
  }

  extractPersonalInfo(dto: any): string[] {
    if (!dto) return [];

    const personalInfo: string[] = []; // Explicitly type as string[]

    // Extract information from the DTO
    if (dto.username) personalInfo.push(dto.username);
    if (dto.email) {
      personalInfo.push(dto.email);
      // Also add email username part
      const emailUsername = dto.email.split('@')[0];
      if (emailUsername) personalInfo.push(emailUsername);
    }
    if (dto.firstName) personalInfo.push(dto.firstName);
    if (dto.lastName) personalInfo.push(dto.lastName);

    return personalInfo;
  }

  checkPersonalInfo(password: string, personalInfo: string[]): boolean {
    const lowerPassword = password.toLowerCase();

    for (const info of personalInfo) {
      if (!info) continue;

      const lowerInfo = info.toLowerCase();

      // Check for exact match
      if (lowerPassword.includes(lowerInfo) && lowerInfo.length >= 3) {
        return true;
      }

      // Check for reversed (e.g. "john" -> "nhoj")
      const reversed = lowerInfo.split('').reverse().join('');
      if (lowerPassword.includes(reversed) && reversed.length >= 3) {
        return true;
      }

      // Check for l33t speak substitutions (basic ones)
      const leetSpeak = lowerInfo
        .replace(/a/g, '4')
        .replace(/e/g, '3')
        .replace(/i/g, '1')
        .replace(/o/g, '0')
        .replace(/s/g, '5');

      if (lowerPassword.includes(leetSpeak) && leetSpeak.length >= 3) {
        return true;
      }
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const strength = (args.object as any)
      .__passwordStrength as PasswordStrengthFeedback;

    if (!strength) {
      return 'Password does not meet security requirements';
    }

    // If there are specific validation failures, provide those messages
    if (strength.feedback && strength.feedback.length) {
      return strength.feedback.join('. ');
    }

    // Generic message if no specific feedback
    return 'Password is not strong enough. Please choose a stronger password.';
  }
}

/**
 * Custom decorator to validate password strength
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: PasswordStrengthConstraint,
    });
  };
}
