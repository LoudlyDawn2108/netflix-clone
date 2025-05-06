import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the user from the request object
 *
 * @example
 * ```ts
 * @Get('profile')
 * getProfile(@GetUser() user: User) {
 *   return user;
 * }
 *
 * // Get specific property
 * @Get('email')
 * getEmail(@GetUser('email') email: string) {
 *   return email;
 * }
 * ```
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If no user in request, return undefined
    if (!user) {
      return undefined;
    }

    // If a specific property is requested, return that property
    if (data) {
      return user[data];
    }

    // Otherwise, return the whole user object
    return user;
  },
);
