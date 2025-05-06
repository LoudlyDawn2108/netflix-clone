import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';
import { TokenValidationCacheService } from '../../../core/cache/token-validation-cache.service';
import { LoggerService } from '../../../core/logging/logger.service';
import { MetricsService } from '../../../core/monitoring/metrics.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private tokenValidationCacheService: TokenValidationCacheService,
    private logger: LoggerService,
    private metrics: MetricsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      passReqToCallback: true,
    });
    this.logger.setContext('JwtStrategy');
  }

  async validate(req: Request, payload: JwtPayload): Promise<any> {
    const startTime = Date.now();
    const token = this.extractTokenFromHeader(req);

    try {
      if (!token) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      // Try to get validated user from cache first
      const cachedUser =
        await this.tokenValidationCacheService.getValidatedToken(token);

      if (cachedUser) {
        // Cache hit - return cached user data
        this.logger.debug(`Using cached validation for user ${cachedUser.sub}`);
        return cachedUser;
      }

      // Cache miss - validate from database
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        this.logger.warn(
          `JWT validation failed: User not found: ${payload.sub}`,
        );
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        this.logger.warn(`JWT validation failed: User inactive: ${user.id}`);
        throw new UnauthorizedException('User account is inactive');
      }

      // Adding roles and permissions to the payload
      const enhancedPayload = {
        ...payload,
        roles: [user.role], // Add user role
        permissions: await this.usersService.getUserPermissions(user.id),
      };

      // Cache the validated token with enhanced payload for future requests
      this.tokenValidationCacheService.cacheValidToken(token, enhancedPayload);

      return enhancedPayload;
    } catch (error) {
      this.logger.error('JWT validation error', error);
      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.observeRequestDuration(
        'AUTH',
        '/validate-token',
        200,
        duration,
      );
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers?.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
