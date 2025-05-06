import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ThrottlerException } from '@nestjs/throttler';

/**
 * Filter for handling rate limiting exceptions
 * Provides user-friendly responses when request limits are exceeded
 */
@Catch(ThrottlerException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RateLimitExceptionFilter.name);

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = HttpStatus.TOO_MANY_REQUESTS;
    const requestId = uuidv4();

    // Build the response body
    const responseBody = {
      statusCode: status,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      retryAfter: this.getRetryAfterSeconds(request),
    };

    // Log the rate limit event with context
    this.logger.warn(
      `Rate limit exceeded for ${request.method} ${request.url}`,
      {
        requestId,
        ip: request.ip,
        userAgent: request.get('user-agent'),
        headers: request.headers,
      },
    );

    // Set the Retry-After header
    if (responseBody.retryAfter) {
      response.header('Retry-After', String(responseBody.retryAfter));
    }

    // Send the response
    response.status(status).json(responseBody);
  }

  /**
   * Get the retry-after value in seconds, if available
   */
  private getRetryAfterSeconds(request: Request): number | undefined {
    // Try to get ttl from ThrottlerGuard context
    if (request.ttl) {
      return Math.ceil(request.ttl / 1000);
    }

    // Default retry period if not available
    return 60;
  }
}
