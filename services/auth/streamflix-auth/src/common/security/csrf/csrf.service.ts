import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHmac } from 'crypto';
import { Response } from 'express';

@Injectable()
export class CsrfService {
  private readonly secret: string;
  private readonly headerName: string;
  private readonly cookieName: string;
  private readonly cookieOptions: {
    httpOnly: boolean;
    path: string;
    sameSite: boolean | 'lax' | 'strict' | 'none';
    secure: boolean;
    maxAge: number;
  };

  constructor(private readonly configService: ConfigService) {
    // Get CSRF configuration from environment variables with defaults
    this.secret = configService.get<string>(
      'CSRF_SECRET',
      randomBytes(32).toString('hex'),
    );
    this.headerName = configService.get<string>('CSRF_HEADER', 'X-CSRF-Token');
    this.cookieName = configService.get<string>('CSRF_COOKIE', 'XSRF-TOKEN');

    // Configure cookies based on environment
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    this.cookieOptions = {
      httpOnly: true, // Make cookie inaccessible to JavaScript
      path: '/',
      sameSite: isProduction ? 'strict' : 'lax',
      secure: isProduction, // Secure in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  /**
   * Generate a new CSRF token
   * @returns The generated token
   */
  generateToken(): string {
    // Generate a random token with 32 bytes of entropy
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a signature for a token
   * @param token The token to sign
   * @returns The signature
   */
  createSignature(token: string): string {
    return createHmac('sha256', this.secret).update(token).digest('hex');
  }

  /**
   * Validate a token against a signature
   * @param token The token from request header
   * @param signature The signature from cookie
   * @returns Whether the token is valid
   */
  validateToken(token: string, signature: string): boolean {
    // Create a new signature from the token and compare with the provided one
    const expectedSignature = this.createSignature(token);
    return signature === expectedSignature;
  }

  /**
   * Set CSRF token cookie and return the token to be sent in response body or header
   * @param res Express response object
   * @returns The generated CSRF token
   */
  setTokenCookie(res: Response): string {
    const token = this.generateToken();
    const signature = this.createSignature(token);

    // Set the signature in a cookie
    res.cookie(this.cookieName, signature, this.cookieOptions);

    // Return the token to be set in header/form
    return token;
  }

  /**
   * Get the CSRF header name
   * @returns The header name
   */
  getHeaderName(): string {
    return this.headerName;
  }

  /**
   * Get the CSRF cookie name
   * @returns The cookie name
   */
  getCookieName(): string {
    return this.cookieName;
  }
}
