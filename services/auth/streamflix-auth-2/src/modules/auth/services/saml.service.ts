import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as samlify from 'samlify';
import * as fs from 'fs';
import * as path from 'path';
import * as uuid from 'uuid';
import { UsersService } from '../../users/users.service';
import { EventsService } from '../../events/events.service';
import { TokenCacheService } from '../../../core/cache/token-cache.service';

interface SamlProvider {
  name: string;
  enabled: boolean;
  displayName: string;
  idp: any; // SAML Identity Provider
  sp: any; // SAML Service Provider
  attributeMapping: Record<string, string>;
  groupAttributeName?: string;
  groupMapping?: Record<string, string>;
}

@Injectable()
export class SamlService implements OnModuleInit {
  private readonly logger = new Logger(SamlService.name);
  private providers: Map<string, SamlProvider> = new Map();
  private baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
    private readonly tokenCacheService: TokenCacheService,
  ) {}

  async onModuleInit() {
    // Set up default options
    this.baseUrl = this.configService.get(
      'app.baseUrl',
      'http://localhost:3000',
    );

    // Initialize SAML providers
    const providersConfig = this.configService.get('enterprise.saml.providers');

    if (!providersConfig || !providersConfig.length) {
      this.logger.log('No SAML providers configured');
      return;
    }

    for (const config of providersConfig) {
      try {
        if (config.enabled) {
          await this.configureProvider(config);
          this.logger.log(`SAML provider configured: ${config.name}`);
        } else {
          this.logger.log(`SAML provider disabled: ${config.name}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to configure SAML provider ${config.name}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Configure a SAML provider
   */
  private async configureProvider(config: any): Promise<void> {
    // Set up the Identity Provider
    const idp = samlify.IdentityProvider({
      metadata: config.metadata || null,
      entityID: config.entryPoint,
      wantAuthnResponseSigned: config.wantAuthnResponseSigned !== false,
      isAssertionEncrypted: config.isAssertionEncrypted || false,
      singleSignOnService: [
        {
          Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
          Location: config.entryPoint,
        },
      ],
      signingCert: config.cert,
    });

    // Set up the Service Provider
    let privateKey = config.privateKey;
    let privateCert = config.privateCert;

    // Check if the keys are file paths
    if (privateKey && privateKey.startsWith('file://')) {
      const keyPath = privateKey.replace('file://', '');
      privateKey = fs.readFileSync(path.resolve(keyPath), 'utf8');
    }

    if (privateCert && privateCert.startsWith('file://')) {
      const certPath = privateCert.replace('file://', '');
      privateCert = fs.readFileSync(path.resolve(certPath), 'utf8');
    }

    const sp = samlify.ServiceProvider({
      entityID: `${this.baseUrl}/auth/saml/metadata/${config.name}`,
      authnRequestsSigned: !!privateKey,
      wantAssertionsSigned: true,
      wantMessageSigned: true,
      wantLogoutRequestSigned: !!privateKey,
      wantLogoutResponseSigned: !!privateKey,
      privateKey: privateKey,
      privateKeyPass: config.privateKeyPass,
      certificateFile: privateCert,
      assertionConsumerService: [
        {
          Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          Location: `${this.baseUrl}/auth/saml/callback/${config.name}`,
        },
      ],
      singleLogoutService: [
        {
          Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          Location: `${this.baseUrl}/auth/saml/logout/${config.name}`,
        },
      ],
    });

    // Store the provider configuration
    this.providers.set(config.name, {
      name: config.name,
      enabled: true,
      displayName: config.displayName || config.name,
      idp,
      sp,
      attributeMapping: config.attributeMapping || {
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName',
        displayName: 'displayName',
      },
      groupAttributeName: config.groupAttributeName,
      groupMapping: config.groupMapping,
    });
  }

  /**
   * Get all available SAML providers
   */
  getProviders(): { name: string; displayName: string }[] {
    return Array.from(this.providers.values())
      .filter((provider) => provider.enabled)
      .map((provider) => ({
        name: provider.name,
        displayName: provider.displayName,
      }));
  }

  /**
   * Generate a SAML login URL
   */
  async getLoginUrl(providerName: string, returnUrl: string): Promise<string> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`SAML provider not found: ${providerName}`);
    }

    // Generate a unique state for this login request
    const state = uuid.v4();

    // Store the state with return URL
    await this.tokenCacheService.setOAuthState(
      state,
      JSON.stringify({
        relayState: returnUrl,
        provider: providerName,
        timestamp: new Date().toISOString(),
      }),
      3600,
    ); // 1 hour expiry

    // Generate login request
    const { context } = provider.sp.createLoginRequest(
      provider.idp,
      'redirect',
    );

    return context;
  }

  /**
   * Process a SAML response
   */
  async processSamlResponse(
    providerName: string,
    samlResponse: string,
    relayState?: string,
  ): Promise<{ user: any; isNewUser: boolean }> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`SAML provider not found: ${providerName}`);
    }

    try {
      // Parse and validate the SAML response
      const { extract } = await provider.sp.parseLoginResponse(
        provider.idp,
        'post',
        { SAMLResponse: samlResponse },
      );

      // Extract user information from the SAML assertion
      const samlUser = this.extractUserFromAssertion(extract, provider);

      if (!samlUser || !samlUser.email) {
        throw new Error('Missing required user information in SAML assertion');
      }

      // Check if user exists
      let user = await this.usersService.findByEmail(samlUser.email);
      let isNewUser = false;

      if (!user) {
        // User does not exist, create it (Just-In-Time provisioning)
        isNewUser = true;

        user = await this.usersService.create({
          email: samlUser.email,
          firstName: samlUser.firstName,
          lastName: samlUser.lastName,
          displayName:
            samlUser.displayName ||
            `${samlUser.firstName} ${samlUser.lastName}`,
          emailVerified: true, // Trust SAML for email verification
          externalId: `saml:${providerName}:${samlUser.nameID || samlUser.email}`,
          isExternal: true,
          // Don't set password for SAML users
        });

        // Emit event
        await this.eventsService.emitUserRegistered(user, {
          source: `saml:${providerName}`,
          isJIT: true,
        });
      }

      // Assign roles based on SAML groups
      if (
        samlUser.groups &&
        samlUser.groups.length > 0 &&
        provider.groupMapping
      ) {
        const rolesToAssign = [];

        for (const group of samlUser.groups) {
          if (provider.groupMapping[group]) {
            rolesToAssign.push(provider.groupMapping[group]);
          }
        }

        if (rolesToAssign.length > 0) {
          await this.usersService.assignRoles(user.id, rolesToAssign);
        }
      }

      // Update user profile from SAML attributes
      if (!isNewUser) {
        const updates: Record<string, any> = {};
        let hasUpdates = false;

        // Only update these fields if they're different
        if (samlUser.firstName && samlUser.firstName !== user.firstName) {
          updates.firstName = samlUser.firstName;
          hasUpdates = true;
        }

        if (samlUser.lastName && samlUser.lastName !== user.lastName) {
          updates.lastName = samlUser.lastName;
          hasUpdates = true;
        }

        if (samlUser.displayName && samlUser.displayName !== user.displayName) {
          updates.displayName = samlUser.displayName;
          hasUpdates = true;
        }

        if (hasUpdates) {
          await this.usersService.update(user.id, updates);
          user = { ...user, ...updates };
        }
      }

      // Emit login event
      await this.eventsService.emitUserLoggedIn(user, {
        method: `saml:${providerName}`,
        jit: isNewUser,
      });

      return { user, isNewUser };
    } catch (error) {
      this.logger.error(
        `SAML response processing error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Extract user information from SAML assertion
   */
  private extractUserFromAssertion(extract: any, provider: SamlProvider): any {
    const user: Record<string, any> = {};
    const attributeMapping = provider.attributeMapping;

    // Extract attributes based on the mapping
    for (const [key, samlAttr] of Object.entries(attributeMapping)) {
      if (extract.attributes[samlAttr]) {
        user[key] = extract.attributes[samlAttr];
      }
    }

    // Extract groups if configured
    if (
      provider.groupAttributeName &&
      extract.attributes[provider.groupAttributeName]
    ) {
      let groups = extract.attributes[provider.groupAttributeName];

      // Normalize groups to array
      if (!Array.isArray(groups)) {
        groups = [groups];
      }

      user.groups = groups;
    } else {
      user.groups = [];
    }

    // Extract NameID
    if (extract.nameID) {
      user.nameID = extract.nameID;
    }

    return user;
  }

  /**
   * Generate Service Provider metadata XML
   */
  getServiceProviderMetadata(providerName: string): string {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`SAML provider not found: ${providerName}`);
    }

    return provider.sp.getMetadata();
  }

  /**
   * Process a SAML logout request
   */
  async processSamlLogout(
    providerName: string,
    samlRequest: string,
  ): Promise<string> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`SAML provider not found: ${providerName}`);
    }

    try {
      // Parse and validate the SAML logout request
      const { extract, context } = await provider.sp.parseLogoutRequest(
        provider.idp,
        'post',
        { SAMLRequest: samlRequest },
      );

      // In a real implementation, we would invalidate the user's session here
      // using the NameID from the logout request

      // For now, just return the logout response
      return context;
    } catch (error) {
      this.logger.error(
        `SAML logout processing error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
