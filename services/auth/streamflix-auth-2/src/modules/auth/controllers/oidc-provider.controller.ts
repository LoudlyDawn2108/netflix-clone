import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Req,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { OidcProviderService } from '../services/oidc-provider.service';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthService } from '../services/auth.service';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('auth/oidc')
export class OidcProviderController {
  private readonly logger = new Logger(OidcProviderController.name);

  constructor(
    private readonly oidcService: OidcProviderService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  /**
   * OpenID Connect discovery document
   */
  @Public()
  @Get('.well-known/openid-configuration')
  getDiscoveryDocument() {
    return this.oidcService.getDiscoveryDocument();
  }

  /**
   * JWKS endpoint
   */
  @Public()
  @Get('.well-known/jwks.json')
  getJwks() {
    return this.oidcService.getJwks();
  }

  /**
   * Authorization endpoint
   */
  @Public()
  @Get('authorize')
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('nonce') nonce: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Validate client and redirect URI
      const client = this.oidcService.getClient(clientId);

      if (!client) {
        throw new HttpException('Invalid client', HttpStatus.BAD_REQUEST);
      }

      if (!this.oidcService.validateRedirectUri(clientId, redirectUri)) {
        throw new HttpException('Invalid redirect URI', HttpStatus.BAD_REQUEST);
      }

      // Parse scopes
      const scopes = scope ? scope.split(' ') : ['openid'];

      // Validate response type (we only support 'code' for now)
      if (responseType !== 'code') {
        return this.redirectWithError(
          redirectUri,
          'unsupported_response_type',
          'Only code response_type is supported',
          state,
        );
      }

      // Check if user is authenticated
      const user = req.user;

      if (!user) {
        // User is not authenticated, redirect to login
        const loginRedirectUrl = `/auth/login?returnTo=${encodeURIComponent(
          req.originalUrl,
        )}`;

        return res.redirect(loginRedirectUrl);
      }

      // User is authenticated, generate authorization code
      const code = await this.oidcService.generateAuthCode(
        clientId,
        user.id,
        scopes,
        redirectUri,
        nonce,
        codeChallenge,
        codeChallengeMethod,
      );

      // Redirect back to client with code
      const redirectParams = new URLSearchParams({
        code,
        ...(state ? { state } : {}),
      });

      return res.redirect(`${redirectUri}?${redirectParams.toString()}`);
    } catch (error) {
      this.logger.error(`Authorization error: ${error.message}`);

      // If we have a valid redirect URI, redirect with error
      if (
        redirectUri &&
        this.oidcService.validateRedirectUri(clientId, redirectUri)
      ) {
        return this.redirectWithError(
          redirectUri,
          'server_error',
          error.message,
          state,
        );
      }

      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Token endpoint
   */
  @Public()
  @Post('token')
  async token(
    @Body('grant_type') grantType: string,
    @Body('code') code: string,
    @Body('refresh_token') refreshToken: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('client_id') clientId: string,
    @Body('client_secret') clientSecret: string,
    @Body('code_verifier') codeVerifier: string,
    @Req() req: Request,
  ) {
    try {
      // Validate client authentication
      const client = this.oidcService.getClient(clientId);

      if (!client) {
        throw new HttpException('Invalid client', HttpStatus.UNAUTHORIZED);
      }

      // Handle different grant types
      switch (grantType) {
        case 'authorization_code':
          if (!code || !redirectUri) {
            throw new HttpException(
              'Missing required parameters',
              HttpStatus.BAD_REQUEST,
            );
          }

          return this.oidcService.exchangeCodeForTokens(
            code,
            clientId,
            redirectUri,
            codeVerifier,
          );

        case 'refresh_token':
          if (!refreshToken) {
            throw new HttpException(
              'Missing refresh_token',
              HttpStatus.BAD_REQUEST,
            );
          }

          return this.oidcService.refreshTokens(refreshToken, clientId);

        default:
          throw new HttpException(
            'Unsupported grant type',
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      this.logger.error(`Token endpoint error: ${error.message}`);
      throw new HttpException(
        { error: 'invalid_request', error_description: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Token revocation endpoint
   */
  @Public()
  @Post('revoke')
  async revoke(
    @Body('token') token: string,
    @Body('token_type_hint') tokenTypeHint: string,
    @Body('client_id') clientId: string,
    @Body('client_secret') clientSecret: string,
  ) {
    try {
      if (!token || !clientId) {
        throw new HttpException(
          'Missing required parameters',
          HttpStatus.BAD_REQUEST,
        );
      }

      const revoked = await this.oidcService.revokeToken(token, clientId);

      return {}; // Always return 200 OK as per spec, even if token was not found
    } catch (error) {
      this.logger.error(`Token revocation error: ${error.message}`);
      throw new HttpException(
        { error: 'invalid_request', error_description: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * UserInfo endpoint
   */
  @Public()
  @Get('userinfo')
  async userinfo(@Req() req: Request) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new HttpException(
          'Missing access token',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const accessToken = authHeader.substring(7);

      return this.oidcService.getUserInfo(accessToken);
    } catch (error) {
      this.logger.error(`UserInfo error: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * End session endpoint
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('end-session')
  async endSession(
    @Query('id_token_hint') idTokenHint: string,
    @Query('post_logout_redirect_uri') postLogoutRedirectUri: string,
    @Query('state') state: string,
    @GetUser() user: User,
    @Res() res: Response,
  ) {
    try {
      // In a real implementation, validate id_token_hint and post_logout_redirect_uri

      // Logout user from our system
      await this.authService.logout(user.id);

      // Redirect to client's post-logout redirect URI if provided
      if (postLogoutRedirectUri) {
        const redirectParams = new URLSearchParams(state ? { state } : {});
        const redirectUrl = `${postLogoutRedirectUri}${
          redirectParams.toString() ? '?' + redirectParams.toString() : ''
        }`;

        return res.redirect(redirectUrl);
      }

      return res.json({ success: true });
    } catch (error) {
      this.logger.error(`End session error: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Helper method to redirect with error parameters
   */
  private redirectWithError(
    redirectUri: string,
    error: string,
    errorDescription: string,
    state?: string,
  ): Response {
    const params = new URLSearchParams({
      error,
      error_description: errorDescription,
      ...(state ? { state } : {}),
    });

    return Response.redirect(`${redirectUri}?${params.toString()}`);
  }
}
