import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base HttpException filter that handles formatting of error responses
 * Provides a structured error response with:
 * - HTTP status code
 * - Error code
 * - Error message
 * - Optional details
 * - Timestamp and request identifier
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Generate a request ID for tracing
    const requestId = uuidv4();

    // Get the original response object which might contain additional data
    const errorResponse = exception.getResponse() as any;

    // Format the error response
    const responseBody = {
      statusCode: status,
      errorCode: this.determineErrorCode(exception),
      message:
        typeof errorResponse === 'object' && errorResponse.message
          ? Array.isArray(errorResponse.message)
            ? errorResponse.message[0]
            : errorResponse.message
          : exception.message,
      details:
        typeof errorResponse === 'object' &&
        errorResponse.message &&
        Array.isArray(errorResponse.message)
          ? errorResponse.message
          : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Log the error with context
    this.logger.error(
      `${request.method} ${request.url} ${status} - ${JSON.stringify(responseBody)}`,
      exception.stack,
      {
        requestId,
        userId: request.user?.id || 'anonymous',
        userIp: request.ip,
        userAgent: request.get('user-agent'),
      },
    );

    // Send the formatted error response
    response.status(status).json(responseBody);
  }

  /**
   * Determines a specific error code based on the exception
   * This can be extended in derived classes
   */
  protected determineErrorCode(exception: HttpException): string {
    // Default implementation maps HTTP status codes to readable error codes
    const status = exception.getStatus();
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'TOO_MANY_REQUESTS';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      default:
        return `HTTP_ERROR_${status}`;
    }
  }
}
