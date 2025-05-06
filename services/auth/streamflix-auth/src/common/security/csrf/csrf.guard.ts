import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CsrfService } from './csrf.service';
import { IS_CSRF_PROTECTED_KEY } from './csrf.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly csrfService: CsrfService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isProtected = this.reflector.getAllAndOverride<boolean>(
      IS_CSRF_PROTECTED_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If endpoint is not protected by CSRF, allow the request
    if (!isProtected) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Skip CSRF check for non-mutating methods
    const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (safeMethod) {
      return true;
    }

    // Get token from headers and cookies
    const csrfHeader = request.header(this.csrfService.getHeaderName());

    // Find the cookie with the CSRF signature
    const cookieName = this.csrfService.getCookieName();
    const cookies = request.cookies || {};
    const csrfCookie = cookies[cookieName];

    // Validate CSRF token
    if (!csrfHeader || !csrfCookie) {
      throw new UnauthorizedException('CSRF token missing');
    }

    const isValidToken = this.csrfService.validateToken(csrfHeader, csrfCookie);
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid CSRF token');
    }

    return true;
  }
}
