import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as csrf from 'csurf';

@Injectable()
export class CsrfService {
  constructor(private configService: ConfigService) {}

  /**
   * Create CSRF protection middleware
   */
  createCsrfProtection() {
    const csrfEnabled = this.configService.get<boolean>('security.csrfEnabled');

    if (!csrfEnabled) {
      return (req: any, res: any, next: () => void) => next();
    }

    return csrf({
      cookie: {
        key:
          this.configService.get<string>('security.csrfCookieName') ||
          'XSRF-TOKEN',
        httpOnly: true,
        sameSite: 'strict',
        secure: this.configService.get('env') === 'production',
      },
    });
  }

  /**
   * Generate a CSRF token and set it in response cookie
   */
  generateToken(req: any, res: any) {
    if (req.csrfToken && typeof req.csrfToken === 'function') {
      const token = req.csrfToken();
      res.cookie(
        this.configService.get<string>('security.csrfCookieName') ||
          'XSRF-TOKEN',
        token,
        {
          httpOnly: false, // Needs to be accessible from JavaScript
          sameSite: 'strict',
          secure: this.configService.get('env') === 'production',
        },
      );
      return token;
    }
    return null;
  }
}
