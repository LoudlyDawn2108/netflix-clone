import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extract correlation ID from headers or generate a new one
    const correlationIdHeader = req.headers['x-correlation-id'];
    const correlationId = correlationIdHeader
      ? correlationIdHeader.toString()
      : uuidv4();

    // Set the correlation ID in the logger
    this.logger.setCorrelationId(correlationId);

    // Add correlation ID to request object for use in controllers
    req['correlationId'] = correlationId;

    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Log the incoming request
    this.logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Capture response metrics
    const startTime = Date.now();

    // Log response information when the request completes
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      this.logger.info(`Request completed: ${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: duration,
      });
    });

    next();
  }
}
