import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Specialized filter for handling password strength validation errors
 * Provides detailed responses for different password validation failures
 */
@Catch(BadRequestException)
export class PasswordStrengthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PasswordStrengthExceptionFilter.name);

  // Common password validation keywords to identify error types
  private static readonly PASSWORD_VALIDATION_KEYWORDS = {
    LENGTH: ['length', 'too short', 'at least', 'minimum'],
    UPPERCASE: ['uppercase', 'upper case', 'capital'],
    LOWERCASE: ['lowercase', 'lower case'],
    DIGIT: ['digit', 'number'],
    SPECIAL: ['special', 'symbol', 'character'],
    COMMON: ['common', 'dictionary', 'frequently used'],
    MATCH: ['match', 'matching', 'same as', 'confirmation'],
    PREVIOUS: ['previous', 'history', 'recent', 'already used'],
  };

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Only apply this filter to password-related error messages
    // Otherwise, let the request pass through to other filters
    const errorResponse = exception.getResponse() as any;
    const messages = Array.isArray(errorResponse.message)
      ? errorResponse.message
      : [errorResponse.message];

    // Check if this is a password-related error
    const passwordError = this.findPasswordError(messages);

    if (!passwordError) {
      // Not a password error, let it pass through to other filters
      return;
    }

    const status = exception.getStatus();
    const requestId = uuidv4();

    // Determine the specific password error type
    const errorDetails = this.analyzePasswordError(passwordError);

    const responseBody = {
      statusCode: status,
      errorCode: errorDetails.code,
      message: errorDetails.message,
      field: 'password',
      passwordRequirements: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigit: true,
        requireSpecial: true,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Log the error
    this.logger.error(
      `Password validation error on ${request.method} ${request.url}: ${passwordError}`,
      {
        requestId,
        errorCode: errorDetails.code,
      },
    );

    // Send the response
    response.status(status).json(responseBody);
    return;
  }

  /**
   * Find password-related error in validation messages
   */
  private findPasswordError(messages: string[]): string | null {
    const passwordKeywords = ['password', 'pwd'];

    for (const message of messages) {
      const lowerMessage = message.toLowerCase();
      if (passwordKeywords.some((keyword) => lowerMessage.includes(keyword))) {
        return message;
      }
    }

    return null;
  }

  /**
   * Analyze the password error message and return structured information
   */
  private analyzePasswordError(message: string): {
    code: string;
    message: string;
  } {
    const lowerMessage = message.toLowerCase();

    // Check for password match error (confirmation doesn't match)
    if (
      this.containsAnyKeyword(
        lowerMessage,
        PasswordStrengthExceptionFilter.PASSWORD_VALIDATION_KEYWORDS.MATCH,
      )
    ) {
      return {
        code: 'PASSWORD_MISMATCH',
        message: 'Password and confirmation do not match.',
      };
    }

    // Check for password length error
    if (
      this.containsAnyKeyword(
        lowerMessage,
        PasswordStrengthExceptionFilter.PASSWORD_VALIDATION_KEYWORDS.LENGTH,
      )
    ) {
      return {
        code: 'PASSWORD_TOO_SHORT',
        message: 'Password must be at least 8 characters long.',
      };
    }

    // Check for missing uppercase error
    if (
      this.containsAnyKeyword(
        lowerMessage,
        PasswordStrengthExceptionFilter.PASSWORD_VALIDATION_KEYWORDS.UPPERCASE,
      )
    ) {
      return {
        code: 'PASSWORD_REQUIRES_UPPERCASE',
        message: 'Password must contain at least one uppercase letter.',
      };
    }

    // Check for missing lowercase error
    if (
      this.containsAnyKeyword(
        lowerMessage,
        PasswordStrengthExceptionFilter.PASSWORD_VALIDATION_KEYWORDS.LOWERCASE,
      )
    ) {
      return {
        code: 'PASSWORD_REQUIRES_LOWERCASE',
        message: 'Password must contain at least one lowercase letter.',
      };
    }

    // Check for missing digit error
    if (
      this.containsAnyKeyword(
        lowerMessage,
        PasswordStrengthExceptionFilter.PASSWORD_VALIDATION_KEYWORDS.DIGIT,
      )
    ) {
      return {
        code: 'PASSWORD_REQUIRES_DIGIT',
        message: 'Password must contain at least one number.',
      };
    }

    // Check for missing special character error
    if (
      this.containsAnyKeyword(
        lowerMessage,
        PasswordStrengthExceptionFilter.PASSWORD_VALIDATION_KEYWORDS.SPECIAL,
      )
    ) {
      return {
        code: 'PASSWORD_REQUIRES_SPECIAL',
        message: 'Password must contain at least one special character.',
      };
    }

    // Check for common password error
    if (
      this.containsAnyKeyword(
        lowerMessage,
        PasswordStrengthExceptionFilter.PASSWORD_VALIDATION_KEYWORDS.COMMON,
      )
    ) {
      return {
        code: 'PASSWORD_TOO_COMMON',
        message:
          'This password is too common. Please choose a more unique password.',
      };
    }

    // Check for previously used password
    if (
      this.containsAnyKeyword(
        lowerMessage,
        PasswordStrengthExceptionFilter.PASSWORD_VALIDATION_KEYWORDS.PREVIOUS,
      )
    ) {
      return {
        code: 'PASSWORD_PREVIOUSLY_USED',
        message:
          'You have used this password recently. Please choose a different password.',
      };
    }

    // Default password weakness error
    return {
      code: 'PASSWORD_TOO_WEAK',
      message: 'Password does not meet the security requirements.',
    };
  }

  /**
   * Helper method to check if text contains any of the keywords
   */
  private containsAnyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}
