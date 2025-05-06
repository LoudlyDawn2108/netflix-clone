import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Filter for handling unprocessable entity exceptions
 * Used when the request data is syntactically correct but semantically invalid
 */
@Catch(UnprocessableEntityException)
export class UnprocessableEntityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnprocessableEntityExceptionFilter.name);

  catch(exception: UnprocessableEntityException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const requestId = uuidv4();

    const errorResponse = exception.getResponse() as any;

    // Extract detailed information from the exception
    const message =
      typeof errorResponse === 'object' && errorResponse.message
        ? errorResponse.message
        : 'The request data is invalid.';

    const details =
      typeof errorResponse === 'object' && errorResponse.details
        ? errorResponse.details
        : undefined;

    const field =
      typeof errorResponse === 'object' && errorResponse.field
        ? errorResponse.field
        : undefined;

    // Build the response body
    const responseBody = {
      statusCode: status,
      errorCode: 'UNPROCESSABLE_ENTITY',
      message: Array.isArray(message) ? message[0] : message,
      details: Array.isArray(message) ? message : details,
      field,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Log the error
    this.logger.error(
      `Unprocessable entity error on ${request.method} ${request.url}: ${responseBody.message}`,
      exception.stack,
      { requestId, field },
    );

    // Send the response
    response.status(status).json(responseBody);
  }
}
