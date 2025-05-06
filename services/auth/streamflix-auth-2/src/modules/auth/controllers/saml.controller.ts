import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { SamlService } from '../services/saml.service';
import { AuthService } from '../services/auth.service';
import { TokenCacheService } from '../../../core/cache/token-cache.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth/saml')
export class SamlController {
  private readonly logger = new Logger(SamlController.name);
  private readonly uiBaseUrl: string;

  constructor(
    private readonly samlService: SamlService,
    private readonly authService: AuthService,
    private readonly tokenCacheService: TokenCacheService,
    private readonly configService: ConfigService,
  ) {
    this.uiBaseUrl = this.configService.get(
      'app.uiBaseUrl',
      'http://localhost:3000',
    );
  }

  /**
   * Get available SAML providers
   */
  @Public()
  @Get('providers')
  async getProviders() {
    return {
      providers: this.samlService.getProviders(),
    };
  }

  /**
   * Initiate SAML login flow
   */
  @Public()
  @Get('login/:provider')
  async login(
    @Param('provider') provider: string,
    @Query('returnUrl') returnUrl: string,
    @Res() res: Response,
  ) {
    try {
      const loginUrl = await this.samlService.getLoginUrl(
        provider,
        returnUrl || this.uiBaseUrl,
      );

      return res.redirect(loginUrl);
    } catch (error) {
      this.logger.error(
        `SAML login initiation error: ${error.message}`,
        error.stack,
      );
      return res.redirect(
        `${this.uiBaseUrl}/auth/error?error=saml_login_failed`,
      );
    }
  }

  /**
   * Handle SAML response (callback)
   */
  @Public()
  @Post('callback/:provider')
  async callback(
    @Param('provider') provider: string,
    @Body('SAMLResponse') samlResponse: string,
    @Body('RelayState') relayState: string,
    @Res() res: Response,
  ) {
    try {
      if (!samlResponse) {
        throw new HttpException(
          'Missing SAML response',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Process SAML response
      const { user, isNewUser } = await this.samlService.processSamlResponse(
        provider,
        samlResponse,
        relayState,
      );

      // Generate authentication tokens
      const tokens = await this.authService.generateTokens(user);

      let returnUrl = this.uiBaseUrl;

      // Try to get stored return URL from relay state
      if (relayState) {
        try {
          const stateData =
            await this.tokenCacheService.getOAuthState(relayState);

          if (stateData) {
            const parsedData = JSON.parse(stateData);

            if (parsedData.relayState) {
              returnUrl = parsedData.relayState;
            }

            // Clean up state
            await this.tokenCacheService.deleteOAuthState(relayState);
          }
        } catch (error) {
          this.logger.error(
            `Error processing relay state: ${error.message}`,
            error.stack,
          );
        }
      }

      // Redirect to UI with tokens
      return res.redirect(
        `${returnUrl}?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}&token_type=Bearer&expires_in=${tokens.expiresIn}`,
      );
    } catch (error) {
      this.logger.error(`SAML callback error: ${error.message}`, error.stack);
      return res.redirect(
        `${this.uiBaseUrl}/auth/error?error=saml_callback_failed&message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  /**
   * Get SAML service provider metadata
   */
  @Public()
  @Get('metadata/:provider')
  async metadata(@Param('provider') provider: string, @Res() res: Response) {
    try {
      const metadata = this.samlService.getServiceProviderMetadata(provider);

      res.set('Content-Type', 'text/xml');
      return res.send(metadata);
    } catch (error) {
      this.logger.error(`SAML metadata error: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get metadata',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Handle SAML logout
   */
  @Public()
  @Post('logout/:provider')
  async logout(
    @Param('provider') provider: string,
    @Body('SAMLRequest') samlRequest: string,
    @Res() res: Response,
  ) {
    try {
      if (!samlRequest) {
        throw new HttpException('Missing SAML request', HttpStatus.BAD_REQUEST);
      }

      const logoutResponse = await this.samlService.processSamlLogout(
        provider,
        samlRequest,
      );

      return res.redirect(logoutResponse);
    } catch (error) {
      this.logger.error(`SAML logout error: ${error.message}`, error.stack);
      return res.redirect(
        `${this.uiBaseUrl}/auth/error?error=saml_logout_failed`,
      );
    }
  }
}
