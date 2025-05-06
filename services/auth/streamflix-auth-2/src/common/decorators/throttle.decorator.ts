import { SetMetadata } from '@nestjs/common';

/**
 * Apply custom rate limits to specific routes or controllers
 * @param limit Maximum number of requests within the TTL window
 * @param ttl Time to live in seconds
 */
export const Throttle = (limit: number, ttl: number) =>
  SetMetadata('throttle', { limit, ttl });

/**
 * Skip rate limiting for specific routes or controllers
 */
export const SkipThrottle = () => SetMetadata('skipThrottle', true);

/**
 * Sets to use IP address as a key for rate limiting
 * Use this to limit requests per IP instead of per route
 */
export const ThrottleByIp = () => SetMetadata('throttleByIp', true);
