import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { TokenService } from '../../../auth/token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is marked as public, allow access
    if (isPublic) {
      return true;
    }

    // Get the request object
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.debug('Authentication failed: No token provided');
      throw new UnauthorizedException('Access token is missing');
    }

    try {
      // Validate the token using our token service
      const payload = this.tokenService.validateAccessToken(token);

      // Attach user information to request for use in controllers
      request.user = {
        userId: payload.sub,
        roles: payload.roles || [],
        jti: payload.jti,
      };

      return true;
    } catch (error) {
      this.logger.debug(`Authentication failed: ${error.message}`);
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
