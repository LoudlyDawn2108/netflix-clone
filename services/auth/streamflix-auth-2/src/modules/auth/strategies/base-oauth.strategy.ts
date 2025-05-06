import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import {
  OAuthProviderConfig,
  OAuthUserProfile,
} from '../interfaces/oauth-provider.interface';
import { Request } from 'express';
import { OAuthService } from '../services/oauth.service';

@Injectable()
export abstract class BaseOAuthStrategy extends PassportStrategy(Strategy) {
  protected constructor(
    protected readonly config: OAuthProviderConfig,
    protected readonly oauthService: OAuthService,
  ) {
    super({
      authorizationURL: config.authorizationUrl,
      tokenURL: config.tokenUrl,
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackUrl,
      scope: config.scope,
      passReqToCallback: true,
      state: config.state !== false, // Enable state parameter by default
    });
  }

  /**
   * Extract user profile information from OAuth provider response
   */
  abstract extractProfile(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<OAuthUserProfile>;

  /**
   * Process OAuth validation response
   */
  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
  ): Promise<any> {
    // Extract profile data
    const userProfile = await this.extractProfile(
      accessToken,
      refreshToken,
      profile,
    );

    // If state is present in the request, validate it
    if (req.query.state) {
      const stateValidation = await this.oauthService.validateState(
        req.query.state as string,
      );
      if (!stateValidation.valid) {
        throw new Error('Invalid OAuth state parameter');
      }

      // If authenticated user is linking account
      if (stateValidation.userId) {
        return {
          provider: this.config.name,
          profile: userProfile,
          tokens: { accessToken, refreshToken, expiresIn: params.expires_in },
          linkUserId: stateValidation.userId,
        };
      }
    }

    // Handle normal OAuth authentication
    const { user, isNewUser } = await this.oauthService.handleOAuthUser(
      this.config.name,
      userProfile,
      { accessToken, refreshToken, expiresIn: params.expires_in },
    );

    return {
      user,
      isNewUser,
      provider: this.config.name,
    };
  }
}
