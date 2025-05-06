import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Filter for handling duplicate entity exceptions (PostgreSQL unique constraint violations)
 * Particularly useful for handling duplicate email/username during user registration
 */
@Catch(ConflictException, QueryFailedError)
export class DuplicateEntityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DuplicateEntityExceptionFilter.name);

  // PostgreSQL error codes
  private static readonly PG_UNIQUE_VIOLATION_CODE = '23505';

  // Known constraint names to provide better error messages
  private static readonly CONSTRAINT_TO_FIELD_MAP = {
    UQ_USER_EMAIL: 'email',
    UQ_USER_USERNAME: 'username',
    UQ_USERS_EMAIL: 'email',
    UQ_USERS_USERNAME: 'username',
    users_email_key: 'email',
    users_username_key: 'username',
  };

  catch(exception: ConflictException | QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = uuidv4();

    let status = 409; // Default to conflict status code
    let errorCode = 'ENTITY_ALREADY_EXISTS';
    let message = 'A conflict occurred with an existing entity.';
    let detail: string | undefined = undefined;
    let field: string | undefined = undefined;

    if (exception instanceof ConflictException) {
      // If it's already a NestJS ConflictException
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message || message;

      // Try to extract more details from the message
      if (typeof message === 'string') {
        if (message.toLowerCase().includes('email')) {
          field = 'email';
          errorCode = 'USER_EMAIL_EXISTS';
        } else if (message.toLowerCase().includes('username')) {
          field = 'username';
          errorCode = 'USER_USERNAME_EXISTS';
        }
      }
    } else if (exception instanceof QueryFailedError) {
      // Extract PostgreSQL error code and detail
      const pgError = exception as any;

      if (
        pgError.code === DuplicateEntityExceptionFilter.PG_UNIQUE_VIOLATION_CODE
      ) {
        // This is a unique constraint violation
        detail = pgError.detail;

        // Try to determine which field caused the violation
        if (pgError.constraint) {
          field = this.getFieldFromConstraint(pgError.constraint);

          if (field === 'email') {
            errorCode = 'USER_EMAIL_EXISTS';
            message = 'An account with this email already exists.';
          } else if (field === 'username') {
            errorCode = 'USER_USERNAME_EXISTS';
            message = 'This username is already taken.';
          }
        }
      } else {
        // Some other database error, return a more generic message
        status = 500;
        errorCode = 'DATABASE_ERROR';
        message = 'A database error occurred.';
        detail = pgError.message;
      }
    }

    const responseBody = {
      statusCode: status,
      errorCode,
      message,
      field,
      detail: detail || undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Log the error
    this.logger.error(
      `Duplicate entity error on ${request.method} ${request.url}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      {
        requestId,
        field,
        detail,
      },
    );

    // Send the error response
    response.status(status).json(responseBody);
  }

  /**
   * Extract field name from constraint name
   */
  private getFieldFromConstraint(constraintName: string): string | undefined {
    // First check our known mappings
    for (const [constraint, field] of Object.entries(
      DuplicateEntityExceptionFilter.CONSTRAINT_TO_FIELD_MAP,
    )) {
      if (constraintName.includes(constraint)) {
        return field;
      }
    }

    // Try to guess based on constraint name
    const lowerConstraint = constraintName.toLowerCase();
    if (lowerConstraint.includes('email')) {
      return 'email';
    } else if (
      lowerConstraint.includes('username') ||
      lowerConstraint.includes('user_name')
    ) {
      return 'username';
    }

    return undefined;
  }
}
