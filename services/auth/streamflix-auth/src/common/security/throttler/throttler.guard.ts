import {
  ExecutionContext,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { SKIP_THROTTLE_KEY } from './throttler.decorator';

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
  private readonly logger = new Logger(ThrottlerGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  getRequestResponse(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    return { req: request, res: response };
  }

  // Override to add custom error handling and logging
  protected throwThrottlingException(): void {
    this.logger.warn(`Rate limit exceeded`);
    throw new HttpException(
      'Too Many Requests: Rate limit exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // Override to support custom skipping logic using our decorator
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Check for decorator on handler or controller
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(
      SKIP_THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If explicitly set to true, skip throttling
    if (skipThrottle === true) {
      return true;
    }

    // Check if it's a health check or other system endpoint
    const { req } = this.getRequestResponse(context);
    if (
      req.path === '/health' ||
      req.path === '/metrics' ||
      req.path === '/.well-known/jwks.json'
    ) {
      return true;
    }

    // Override for super.shouldSkip if needed
    return false;
  }

  // Add custom tracking based on forwarded IP addresses for proxy compatibility
  protected getTracker(req: Record<string, any>): string {
    // Try to get real IP from headers when behind proxy
    const realIp =
      req.headers['x-forwarded-for']?.split(',').shift() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      req.connection?.remoteAddress;

    if (!realIp) {
      this.logger.warn('Could not determine client IP address');
      return 'unknown';
    }

    return realIp;
  }
}
