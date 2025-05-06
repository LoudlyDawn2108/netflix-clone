import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';

/**
 * Specialized filter for handling validation errors from class-validator
 * Provides a well-formatted response with validation error details
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const requestId = uuidv4();

    // Get the original response
    const errorResponse: any = exception.getResponse();
    const originalMessage = errorResponse.message;

    // Check if this is a validation error with an array of messages
    const isValidationError = errorResponse && Array.isArray(originalMessage);

    // Prepare the response
    const responseBody = {
      statusCode: status,
      errorCode: 'VALIDATION_FAILED',
      message: isValidationError
        ? 'Validation failed. Please check your input.'
        : errorResponse.message || 'Bad request',
      details: isValidationError ? originalMessage : undefined,
      validationErrors: this.extractValidationErrors(originalMessage),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Log the error with context
    this.logger.error(
      `Validation error on ${request.method} ${request.url}: ${JSON.stringify(responseBody.details)}`,
      {
        requestId,
        userId: request.user?.id || 'anonymous',
        userIp: request.ip,
        userAgent: request.get('user-agent'),
      },
    );

    // Send the structured error response
    response.status(status).json(responseBody);
  }

  /**
   * Extracts validation errors into a more structured format
   * @param errors Array of validation error messages or validation error objects
   * @returns Structured validation errors or undefined
   */
  private extractValidationErrors(errors: any[]): any | undefined {
    if (!Array.isArray(errors)) {
      return undefined;
    }

    // If these are raw validation error messages, just return them as is
    if (typeof errors[0] === 'string') {
      return errors;
    }

    // If these are ValidationError objects, format them
    const formattedErrors = {};

    const processError = (error: ValidationError) => {
      if (error.constraints) {
        formattedErrors[error.property] = Object.values(error.constraints);
      }

      if (error.children && error.children.length) {
        error.children.forEach(processError);
      }
    };

    errors.forEach(processError);

    return Object.keys(formattedErrors).length > 0
      ? formattedErrors
      : undefined;
  }
}
