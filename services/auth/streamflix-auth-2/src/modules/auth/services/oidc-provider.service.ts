import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { TokenCacheService } from '../../../core/cache/token-cache.service';
import { OAuthIdentity } from '../../users/entities/oauth-identity.entity';

interface OidcClient {
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
  allowedScopes: string[];
  name: string;
  logoUri?: string;
  tokenEndpointAuthMethod:
    | 'none'
    | 'client_secret_basic'
    | 'client_secret_post'
    | 'private_key_jwt';
  grantTypes: string[];
  responseTypes: string[];
  postLogoutRedirectUris?: string[];
  applicationType: 'web' | 'native' | 'spa';
}

@Injectable()
export class OidcProviderService {
  private readonly logger = new Logger(OidcProviderService.name);
  private clients: Map<string, OidcClient> = new Map();
  private keyStore: jose.JWK.KeyStore;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(OAuthIdentity)
    private readonly oauthIdentityRepository: Repository<OAuthIdentity>,
    private readonly tokenCacheService: TokenCacheService,
  ) {
    this.initializeKeys();
    this.loadClients();
  }

  /**
   * Initialize JWKS for token signing
   */
  private async initializeKeys() {
    const keysDir = this.configService.get('oidc.keysDir') || './keys';

    try {
      // Create keys directory if it doesn't exist
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }

      const keyPath = path.join(keysDir, 'jwks.json');

      // Load existing keys or create new ones
      if (fs.existsSync(keyPath)) {
        const keyData = fs.readFileSync(keyPath, 'utf8');
        this.keyStore = await jose.JWK.asKeyStore(keyData);
        this.logger.log('OIDC key store loaded successfully');
      } else {
        // Create new key store with RSA and EC keys
        this.keyStore = jose.JWK.createKeyStore();

        // Add RSA key for signing
        await this.keyStore.generate('RSA', 2048, {
          use: 'sig',
          alg: 'RS256',
          kid: 'streamflix-auth-rs256-' + new Date().getTime().toString(),
        });

        // Add EC key for signing
        await this.keyStore.generate('EC', 'P-256', {
          use: 'sig',
          alg: 'ES256',
          kid: 'streamflix-auth-es256-' + new Date().getTime().toString(),
        });

        // Save key store
        const keyData = JSON.stringify(this.keyStore.toJSON(true));
        fs.writeFileSync(keyPath, keyData, 'utf8');

        this.logger.log('New OIDC key store generated and saved');
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize OIDC key store: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Load registered clients from configuration
   */
  private loadClients() {
    const clientsConfig = this.configService.get('oidc.clients') || [];

    for (const client of clientsConfig) {
      this.clients.set(client.clientId, {
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        redirectUris: client.redirectUris || [],
        allowedScopes: client.allowedScopes || ['openid', 'profile', 'email'],
        name: client.name || client.clientId,
        logoUri: client.logoUri,
        tokenEndpointAuthMethod:
          client.tokenEndpointAuthMethod || 'client_secret_basic',
        grantTypes: client.grantTypes || [
          'authorization_code',
          'refresh_token',
        ],
        responseTypes: client.responseTypes || ['code'],
        postLogoutRedirectUris: client.postLogoutRedirectUris || [],
        applicationType: client.applicationType || 'web',
      });

      this.logger.log(
        `OIDC client loaded: ${client.clientId} (${client.name || 'unnamed'})`,
      );
    }
  }

  /**
   * Get JWKS for public key verification
   */
  getJwks() {
    return this.keyStore.toJSON();
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): OidcClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Validate redirect URI for a client
   */
  validateRedirectUri(clientId: string, redirectUri: string): boolean {
    const client = this.getClient(clientId);

    if (!client) {
      return false;
    }

    return client.redirectUris.includes(redirectUri);
  }

  /**
   * Generate authorization code
   */
  async generateAuthCode(
    clientId: string,
    userId: string,
    scopes: string[],
    redirectUri: string,
    nonce?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string,
  ): Promise<string> {
    // Generate a random code
    const code = crypto.randomBytes(32).toString('hex');

    // Store code data
    const codeData = {
      clientId,
      userId,
      scopes,
      redirectUri,
      nonce,
      codeChallenge,
      codeChallengeMethod,
      createdAt: new Date().toISOString(),
    };

    await this.tokenCacheService.storeOidcCode(
      code,
      JSON.stringify(codeData),
      600,
    ); // 10 minutes expiration

    return code;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    expiresIn: number;
    tokenType: string;
  }> {
    // Get code data
    const codeDataStr = await this.tokenCacheService.getOidcCode(code);

    if (!codeDataStr) {
      throw new Error('Invalid or expired authorization code');
    }

    // Delete code to prevent reuse
    await this.tokenCacheService.deleteOidcCode(code);

    const codeData = JSON.parse(codeDataStr);

    // Validate the client ID
    if (codeData.clientId !== clientId) {
      throw new Error('Client ID mismatch');
    }

    // Validate the redirect URI
    if (codeData.redirectUri !== redirectUri) {
      throw new Error('Redirect URI mismatch');
    }

    // Validate PKCE if present
    if (codeData.codeChallenge && codeData.codeChallengeMethod) {
      if (!codeVerifier) {
        throw new Error('Code verifier is required');
      }

      if (codeData.codeChallengeMethod === 'S256') {
        const hash = crypto
          .createHash('sha256')
          .update(codeVerifier)
          .digest('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');

        if (hash !== codeData.codeChallenge) {
          throw new Error('Invalid code verifier');
        }
      } else if (codeData.codeChallengeMethod === 'plain') {
        if (codeVerifier !== codeData.codeChallenge) {
          throw new Error('Invalid code verifier');
        }
      } else {
        throw new Error('Unsupported code challenge method');
      }
    }

    // Get user
    const user = await this.usersService.findById(codeData.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate tokens
    const accessToken = await this.generateAccessToken(
      user,
      codeData.clientId,
      codeData.scopes,
    );
    const idToken = await this.generateIdToken(
      user,
      codeData.clientId,
      codeData.nonce,
      codeData.scopes,
    );
    const refreshToken = await this.generateRefreshToken(
      user.id,
      codeData.clientId,
      codeData.scopes,
    );

    const client = this.getClient(clientId);
    const supportsRefreshToken = client.grantTypes.includes('refresh_token');

    return {
      accessToken,
      idToken,
      refreshToken: supportsRefreshToken ? refreshToken : undefined,
      expiresIn: 3600, // 1 hour
      tokenType: 'Bearer',
    };
  }

  /**
   * Generate access token
   */
  async generateAccessToken(
    user: User,
    clientId: string,
    scopes: string[],
  ): Promise<string> {
    const client = this.getClient(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    // Filter scopes based on what's allowed for the client
    const validScopes = scopes.filter((scope) =>
      client.allowedScopes.includes(scope),
    );

    // Prepare token claims
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const payload = {
      iss: this.configService.get('app.baseUrl'),
      sub: user.id,
      aud: clientId,
      exp: now + expiresIn,
      iat: now,
      scope: validScopes.join(' '),
    };

    // Sign the token with RSA key
    const key = this.keyStore.get({ use: 'sig', alg: 'RS256' });

    if (!key) {
      throw new Error('No suitable signing key found');
    }

    const token = await jose.JWS.createSign({ format: 'compact' }, key)
      .update(JSON.stringify(payload), 'utf8')
      .final();

    return token;
  }

  /**
   * Generate ID token
   */
  async generateIdToken(
    user: User,
    clientId: string,
    nonce?: string,
    scopes: string[] = ['openid'],
  ): Promise<string> {
    // Prepare token claims
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const claims: any = {
      iss: this.configService.get('app.baseUrl'),
      sub: user.id,
      aud: clientId,
      exp: now + expiresIn,
      iat: now,
      auth_time: now, // Assume user just authenticated
    };

    if (nonce) {
      claims.nonce = nonce;
    }

    // Add additional claims based on scopes
    if (scopes.includes('email')) {
      claims.email = user.email;
      claims.email_verified = user.emailVerified;
    }

    if (scopes.includes('profile')) {
      if (user.firstName) claims.given_name = user.firstName;
      if (user.lastName) claims.family_name = user.lastName;
      if (user.displayName) claims.name = user.displayName;
      if (user.avatarUrl) claims.picture = user.avatarUrl;
    }

    // Sign the token with RSA key
    const key = this.keyStore.get({ use: 'sig', alg: 'RS256' });

    if (!key) {
      throw new Error('No suitable signing key found');
    }

    const token = await jose.JWS.createSign({ format: 'compact' }, key)
      .update(JSON.stringify(claims), 'utf8')
      .final();

    return token;
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(
    userId: string,
    clientId: string,
    scopes: string[],
  ): Promise<string> {
    const token = uuidv4();

    const tokenData = {
      userId,
      clientId,
      scopes,
      createdAt: new Date().toISOString(),
    };

    // Store in Redis with longer expiration (30 days)
    await this.tokenCacheService.storeOidcRefreshToken(
      token,
      JSON.stringify(tokenData),
      30 * 24 * 60 * 60, // 30 days
    );

    return token;
  }

  /**
   * Refresh tokens using a refresh token
   */
  async refreshTokens(
    refreshToken: string,
    clientId: string,
  ): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    // Get refresh token data
    const tokenDataStr =
      await this.tokenCacheService.getOidcRefreshToken(refreshToken);

    if (!tokenDataStr) {
      throw new Error('Invalid or expired refresh token');
    }

    const tokenData = JSON.parse(tokenDataStr);

    // Validate client ID
    if (tokenData.clientId !== clientId) {
      throw new Error('Client ID mismatch');
    }

    // Delete old refresh token to prevent reuse
    await this.tokenCacheService.deleteOidcRefreshToken(refreshToken);

    // Get user
    const user = await this.usersService.findById(tokenData.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const accessToken = await this.generateAccessToken(
      user,
      clientId,
      tokenData.scopes,
    );
    const idToken = await this.generateIdToken(
      user,
      clientId,
      undefined,
      tokenData.scopes,
    );
    const newRefreshToken = await this.generateRefreshToken(
      user.id,
      clientId,
      tokenData.scopes,
    );

    return {
      accessToken,
      idToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600, // 1 hour
      tokenType: 'Bearer',
    };
  }

  /**
   * Revoke a token
   */
  async revokeToken(token: string, clientId: string): Promise<boolean> {
    // Try to revoke as refresh token first
    const refreshTokenData =
      await this.tokenCacheService.getOidcRefreshToken(token);

    if (refreshTokenData) {
      const tokenData = JSON.parse(refreshTokenData);

      // Validate client ID
      if (tokenData.clientId !== clientId) {
        return false;
      }

      await this.tokenCacheService.deleteOidcRefreshToken(token);
      return true;
    }

    // If not found as refresh token, try as access token
    // Note: Access tokens are typically not stored but validated by signature
    // For proper revocation, we would add the token to a blacklist

    return false;
  }

  /**
   * Get the user info
   */
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      // Decode and verify token
      const decoded = jose.JWS.createVerify(this.keyStore).verify(accessToken);
      const payload = JSON.parse(decoded.payload.toString());

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired');
      }

      // Get user
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new Error('User not found');
      }

      // Determine scopes
      const scopes = payload.scope ? payload.scope.split(' ') : [];

      // Prepare response based on scopes
      const response: any = {
        sub: user.id,
      };

      if (scopes.includes('email')) {
        response.email = user.email;
        response.email_verified = user.emailVerified;
      }

      if (scopes.includes('profile')) {
        if (user.firstName) response.given_name = user.firstName;
        if (user.lastName) response.family_name = user.lastName;
        if (user.displayName) response.name = user.displayName;
        if (user.avatarUrl) response.picture = user.avatarUrl;
      }

      return response;
    } catch (error) {
      this.logger.error(`Error in getUserInfo: ${error.message}`);
      throw new Error('Invalid token');
    }
  }

  /**
   * Endpoint discovery document
   */
  getDiscoveryDocument() {
    const baseUrl = this.configService.get('app.baseUrl');
    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/auth/oidc/authorize`,
      token_endpoint: `${baseUrl}/auth/oidc/token`,
      userinfo_endpoint: `${baseUrl}/auth/oidc/userinfo`,
      jwks_uri: `${baseUrl}/auth/oidc/.well-known/jwks.json`,
      scopes_supported: ['openid', 'profile', 'email'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256', 'ES256'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'none',
      ],
    };
  }
}
