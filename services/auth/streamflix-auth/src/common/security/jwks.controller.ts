import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from './jwt.service';
import * as jose from 'node-jose';

@Controller('jwks')
export class JwksController {
  private readonly logger = new Logger(JwksController.name);
  private jwksCache: any = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get the JWKS (JSON Web Key Set) containing the public key
   * used to verify tokens issued by this service.
   */
  @Get()
  async getJwks() {
    try {
      // Use cached JWKS if available
      if (this.jwksCache) {
        return this.jwksCache;
      }

      // Get the public key from the JWT service
      const publicKey = this.jwtService.getPublicKey();

      // Get the issuer from config
      const issuer = this.configService.get<string>(
        'JWT_ISSUER',
        'streamflix-auth',
      );

      // Create a key store
      const keystore = jose.JWK.createKeyStore();

      // Import the public key to the key store
      const key = await jose.JWK.asKey(publicKey, 'pem');

      // Create a JWKS object with correct metadata
      this.jwksCache = {
        keys: [
          {
            ...key.toJSON(),
            use: 'sig', // signature verification
            alg: 'RS256', // algorithm
            kid: key.kid, // key ID
            x5t: key.kid, // thumbprint
            issuer,
          },
        ],
      };

      this.logger.log('JWKS endpoint accessed');

      return this.jwksCache;
    } catch (error) {
      this.logger.error(`Error generating JWKS: ${error.message}`);
      throw error;
    }
  }
}
