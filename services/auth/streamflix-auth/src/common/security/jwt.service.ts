import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private privateKey: string;
  private publicKey: string;

  // JWT configuration from environment/config
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(private readonly configService: ConfigService) {
    // Load the JWT expiry times from config
    this.accessTokenExpiresIn = configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '1h',
    );
    this.refreshTokenExpiresIn = configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    this.issuer = configService.get<string>('JWT_ISSUER', 'streamflix-auth');
    this.audience = configService.get<string>('JWT_AUDIENCE', 'streamflix');

    // Load keys
    this.loadKeys();

    this.logger.log(
      `JWT Service initialized with access token expiry: ${this.accessTokenExpiresIn}, refresh token expiry: ${this.refreshTokenExpiresIn}`,
    );
  }

  /**
   * Load RSA keys from the file system
   */
  private loadKeys(): void {
    try {
      // Path to keys
      const keyDir = path.join(__dirname, '../../../', 'keys');
      const privateKeyPath = path.join(keyDir, 'private.key');
      const publicKeyPath = path.join(keyDir, 'public.key');

      // Read the keys
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');

      this.logger.log('RSA keys loaded successfully');
    } catch (error) {
      this.logger.error(`Failed to load RSA keys: ${error.message}`);
      throw new Error(
        'Failed to load RSA keys - make sure they have been generated',
      );
    }
  }

  /**
   * Generate a JWT access token
   * @param payload Data to include in the token
   * @returns Signed JWT token
   */
  generateAccessToken(payload: object): string {
    try {
      // Using as any to work around the StringValue type issue
      const options: jwt.SignOptions = {
        algorithm: 'RS256',
        expiresIn: this.accessTokenExpiresIn as any,
        issuer: this.issuer,
        audience: this.audience,
      };

      return jwt.sign(payload, this.privateKey, options);
    } catch (error) {
      this.logger.error(`Error generating access token: ${error.message}`);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate a refresh token ID
   * @param payload Data to include in the token
   * @returns Signed JWT token for refresh
   */
  generateRefreshToken(payload: object): string {
    try {
      // Using as any to work around the StringValue type issue
      const options: jwt.SignOptions = {
        algorithm: 'RS256',
        expiresIn: this.refreshTokenExpiresIn as any,
        issuer: this.issuer,
        audience: this.audience,
      };

      return jwt.sign(payload, this.privateKey, options);
    } catch (error) {
      this.logger.error(`Error generating refresh token: ${error.message}`);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify a JWT token
   * @param token The JWT token to verify
   * @returns Decoded token payload if valid
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      });
    } catch (error) {
      this.logger.error(`Error verifying token: ${error.message}`);
      throw new Error('Invalid token');
    }
  }

  /**
   * Get token expiration time in seconds
   * @param expiresIn Duration string (e.g., '1h', '7d')
   * @returns Expiration time in seconds
   */
  getExpirationSeconds(expiresIn: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24,
      w: 60 * 60 * 24 * 7,
    };

    const matches = expiresIn.match(/^(\d+)([smhdw])$/);
    if (!matches) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    return value * units[unit];
  }

  /**
   * Get the token expiration timestamp
   * @param token The JWT token
   * @returns Expiration timestamp in seconds
   */
  getTokenExpiration(token: string): number {
    const decoded = this.verifyToken(token);
    return decoded.exp;
  }

  /**
   * Get the public key in PEM format
   * @returns Public key string
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Get the access token expiration time in seconds
   * @returns Access token expiration in seconds
   */
  getAccessTokenExpirySeconds(): number {
    return this.getExpirationSeconds(this.accessTokenExpiresIn);
  }

  /**
   * Get the refresh token expiration time in seconds
   * @returns Refresh token expiration in seconds
   */
  getRefreshTokenExpirySeconds(): number {
    return this.getExpirationSeconds(this.refreshTokenExpiresIn);
  }
}
