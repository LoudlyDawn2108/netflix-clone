import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { OAuthService } from '../services/oauth.service';
import { OAuthUserProfile } from '../interfaces/oauth-provider.interface';
import { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get<string>('oauth.google.clientId'),
      clientSecret: configService.get<string>('oauth.google.clientSecret'),
      callbackURL: configService.get<string>('oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
      passReqToCallback: true,
      state: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const userProfile: OAuthUserProfile = {
        id: profile.id,
        provider: 'google',
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        name: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value,
        rawProfile: profile,
      };

      // If state is present in the request, validate it
      if (req.query.state) {
        const stateValidation = await this.oauthService.validateState(
          req.query.state as string,
        );
        if (!stateValidation.valid) {
          return done(new Error('Invalid OAuth state parameter'), null);
        }

        // If authenticated user is linking account
        if (stateValidation.userId) {
          try {
            const identity = await this.oauthService.linkAccount(
              stateValidation.userId,
              'google',
              userProfile,
              { accessToken, refreshToken },
            );

            return done(null, {
              provider: 'google',
              identity,
              linkUserId: stateValidation.userId,
            });
          } catch (error) {
            return done(error, null);
          }
        }
      }

      // Handle normal OAuth authentication
      const { user, isNewUser } = await this.oauthService.handleOAuthUser(
        'google',
        userProfile,
        { accessToken, refreshToken },
      );

      return done(null, {
        user,
        isNewUser,
        provider: 'google',
      });
    } catch (error) {
      done(error, null);
    }
  }
}
