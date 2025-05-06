import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { OAuthService } from '../services/oauth.service';
import { OAuthUserProfile } from '../interfaces/oauth-provider.interface';
import { Request } from 'express';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get<string>('oauth.github.clientId'),
      clientSecret: configService.get<string>('oauth.github.clientSecret'),
      callbackURL: configService.get<string>('oauth.github.callbackUrl'),
      scope: ['user:email'],
      passReqToCallback: true,
      state: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<void> {
    try {
      // GitHub API doesn't return email by default
      // We parse name differently because GitHub returns just a name field
      const nameParts = profile.displayName
        ? profile.displayName.split(' ')
        : [];
      const firstName = nameParts.length > 0 ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const userProfile: OAuthUserProfile = {
        id: profile.id,
        provider: 'github',
        email: profile.emails?.[0]?.value,
        firstName,
        lastName,
        name: profile.displayName || profile.username,
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
              'github',
              userProfile,
              { accessToken, refreshToken },
            );

            return done(null, {
              provider: 'github',
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
        'github',
        userProfile,
        { accessToken, refreshToken },
      );

      return done(null, {
        user,
        isNewUser,
        provider: 'github',
      });
    } catch (error) {
      done(error, null);
    }
  }
}
