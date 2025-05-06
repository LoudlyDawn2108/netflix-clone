import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { JwtRefreshPayload } from '../interfaces/jwt-refresh-payload.interface';
import { TokenCacheService } from '../../../core/cache/token-cache.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly tokenCacheService: TokenCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.refreshSecret') ||
        'streamflix-refresh-secret',
      passReqToCallback: true,
    } as any);
  }

  async validate(req: Request, payload: JwtRefreshPayload) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authentication header missing');
    }

    const refreshToken = authHeader.replace('Bearer ', '');

    // Check if token is blacklisted
    const isBlacklisted =
      await this.tokenCacheService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Verify token exists in Redis cache
    const storedToken = await this.tokenCacheService.getRefreshToken(
      payload.sub,
      payload.refreshTokenId,
    );

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    return user;
  }
}
