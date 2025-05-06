import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ThrottlerIpGuard extends ThrottlerGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  protected getTracker(req: Record<string, any>): string {
    const useIpTracking =
      this.reflector.get<boolean>('throttleByIp', this.getHandler(req)) ||
      this.configService.get<boolean>('security.rateLimitByIp', true);

    if (useIpTracking) {
      // Generate tracking ID based on IP to limit per client address
      return req.ip || 'unknown-ip';
    }

    // Default behavior is to track by route
    return req.originalUrl;
  }

  protected getTrackerCustomKey(context: ExecutionContext): string {
    const request = this.getRequestResponse(context)[0];
    const useIpTracking =
      this.reflector.get<boolean>('throttleByIp', context.getHandler()) ||
      this.configService.get<boolean>('security.rateLimitByIp', true);

    if (useIpTracking) {
      // For IP-based tracking, include the HTTP method
      return `${request.method}-${request.ip}`;
    }

    // For route-based tracking, use route + method which is the default behavior
    return `${request.method}-${request.url}`;
  }

  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    // Get custom limits if specified
    const customLimits = this.reflector.get<{ limit: number; ttl: number }>(
      'throttle',
      context.getHandler(),
    );

    if (customLimits) {
      // Use custom limits if provided via decorator
      return super.handleRequest(context, customLimits.limit, customLimits.ttl);
    }

    // Use defaults otherwise
    return super.handleRequest(context, limit, ttl);
  }
}
