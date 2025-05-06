import { Injectable, Scope, LogLevel } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface LogContext {
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  private context?: string;
  private correlationId: string;
  private static defaultCorrelationId: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.correlationId =
      LoggerService.defaultCorrelationId || this.generateCorrelationId();
  }

  /**
   * Set a context for the logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Set a correlation ID for request tracing
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
    LoggerService.defaultCorrelationId = correlationId;
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Get the current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Reset the correlation ID
   */
  resetCorrelationId(): void {
    LoggerService.defaultCorrelationId = undefined;
    this.correlationId = this.generateCorrelationId();
  }

  /**
   * Prepare log context with standard fields
   */
  private prepareContext(context?: LogContext): Record<string, any> {
    const logContext: Record<string, any> = {
      correlationId: this.correlationId,
      ...(this.context && { context: this.context }),
    };

    // Add additional context if provided
    if (context) {
      // Remove sensitive data
      const sanitizedContext = this.sanitizeData(context);
      Object.entries(sanitizedContext).forEach(([key, value]) => {
        logContext[key] = value;
      });
    }

    return logContext;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    if (typeof data === 'object') {
      const sanitized = { ...data };

      // List of fields to sanitize
      const sensitiveFields = [
        'password',
        'newPassword',
        'oldPassword',
        'confirmPassword',
        'token',
        'accessToken',
        'refreshToken',
        'jwt',
        'apiKey',
        'secret',
        'credential',
        'ssn',
        'creditCard',
      ];

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Log with custom level
   */
  log(message: string, context?: LogContext): void {
    const logContext = this.prepareContext(context);
    this.logger.info(message, logContext);
  }

  /**
   * Log debug messages
   */
  debug(message: string, context?: LogContext): void {
    const logContext = this.prepareContext(context);
    this.logger.debug(message, logContext);
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext): void {
    const logContext = this.prepareContext(context);
    this.logger.info(message, logContext);
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    const logContext = this.prepareContext(context);
    this.logger.warn(message, logContext);
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    const logContext = this.prepareContext(context);

    if (error) {
      if (error instanceof Error) {
        logContext.stack = error.stack;
        logContext.name = error.name;
      } else {
        logContext.error = error;
      }
    }

    this.logger.error(message, logContext);
  }

  /**
   * Log verbose messages
   */
  verbose(message: string, context?: LogContext): void {
    const logContext = this.prepareContext(context);
    this.logger.verbose(message, logContext);
  }
}
