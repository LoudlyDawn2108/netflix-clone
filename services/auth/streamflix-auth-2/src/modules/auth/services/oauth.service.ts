import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthIdentity } from '../../users/entities/oauth-identity.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { OAuthUserProfile } from '../interfaces/oauth-provider.interface';
import { v4 as uuidv4 } from 'uuid';
import { TokenCacheService } from '../../../core/cache/token-cache.service';

@Injectable()
export class OAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(OAuthIdentity)
    private readonly oauthIdentityRepository: Repository<OAuthIdentity>,
    private readonly tokenCacheService: TokenCacheService,
  ) {}

  /**
   * Generate a state parameter for OAuth flow to prevent CSRF attacks
   */
  async generateState(userId?: string): Promise<string> {
    const state = uuidv4();

    // Store state in Redis with expiration (10 minutes)
    await this.tokenCacheService.storeOAuthState(
      state,
      userId || 'anonymous',
      600, // 10 minutes
    );

    return state;
  }

  /**
   * Validate state parameter from OAuth callback
   */
  async validateState(
    state: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    const userId = await this.tokenCacheService.getOAuthState(state);

    if (!userId) {
      return { valid: false };
    }

    // Delete the state after validation to prevent reuse
    await this.tokenCacheService.deleteOAuthState(state);

    return {
      valid: true,
      userId: userId !== 'anonymous' ? userId : undefined,
    };
  }

  /**
   * Find an existing OAuth identity
   */
  async findIdentity(
    provider: string,
    providerId: string,
  ): Promise<OAuthIdentity | null> {
    return this.oauthIdentityRepository.findOne({
      where: { provider, providerId },
      relations: ['user'],
    });
  }

  /**
   * Create or update OAuth identity and associate with a user
   */
  async saveIdentity(
    userId: string,
    provider: string,
    profile: OAuthUserProfile,
    tokens: { accessToken: string; refreshToken?: string; expiresIn?: number },
  ): Promise<OAuthIdentity> {
    // Check if identity exists
    const existingIdentity = await this.findIdentity(provider, profile.id);

    if (existingIdentity) {
      // Update existing identity
      existingIdentity.email = profile.email || existingIdentity.email;
      existingIdentity.name = profile.name || existingIdentity.name;
      existingIdentity.firstName =
        profile.firstName || existingIdentity.firstName;
      existingIdentity.lastName = profile.lastName || existingIdentity.lastName;
      existingIdentity.avatarUrl =
        profile.avatarUrl || existingIdentity.avatarUrl;
      existingIdentity.rawProfile =
        profile.rawProfile || existingIdentity.rawProfile;
      existingIdentity.accessToken = tokens.accessToken;
      existingIdentity.refreshToken = tokens.refreshToken || null;
      existingIdentity.lastLogin = new Date();

      if (tokens.expiresIn) {
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);
        existingIdentity.tokenExpiresAt = expiresAt;
      }

      return this.oauthIdentityRepository.save(existingIdentity);
    }

    // Create new identity
    const identity = new OAuthIdentity();
    identity.userId = userId;
    identity.provider = provider;
    identity.providerId = profile.id;
    identity.email = profile.email;
    identity.name = profile.name;
    identity.firstName = profile.firstName;
    identity.lastName = profile.lastName;
    identity.avatarUrl = profile.avatarUrl;
    identity.rawProfile = profile.rawProfile;
    identity.accessToken = tokens.accessToken;
    identity.refreshToken = tokens.refreshToken;
    identity.lastLogin = new Date();

    if (tokens.expiresIn) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);
      identity.tokenExpiresAt = expiresAt;
    }

    return this.oauthIdentityRepository.save(identity);
  }

  /**
   * Handle user creation or login via OAuth
   */
  async handleOAuthUser(
    provider: string,
    profile: OAuthUserProfile,
    tokens: { accessToken: string; refreshToken?: string; expiresIn?: number },
  ): Promise<{ user: User; isNewUser: boolean; identity: OAuthIdentity }> {
    // First, check if we already have this OAuth identity
    const existingIdentity = await this.findIdentity(provider, profile.id);

    if (existingIdentity) {
      // User already exists with this identity
      // Update the identity with latest data
      const updatedIdentity = await this.saveIdentity(
        existingIdentity.user.id,
        provider,
        profile,
        tokens,
      );

      // If user has a profile image from OAuth but no avatarUrl set, update it
      if (profile.avatarUrl && !existingIdentity.user.avatarUrl) {
        await this.usersService.update(existingIdentity.user.id, {
          avatarUrl: profile.avatarUrl,
        });
        existingIdentity.user.avatarUrl = profile.avatarUrl;
      }

      return {
        user: existingIdentity.user,
        isNewUser: false,
        identity: updatedIdentity,
      };
    }

    // No existing identity found, check for existing user with same email
    let user: User = null;
    let isNewUser = false;

    if (profile.email) {
      user = await this.usersService.findByEmail(profile.email);

      if (user) {
        // Email already registered, link this OAuth account to the existing user
        const identity = await this.saveIdentity(
          user.id,
          provider,
          profile,
          tokens,
        );

        // If user has no avatar but OAuth provides one, update it
        if (profile.avatarUrl && !user.avatarUrl) {
          await this.usersService.update(user.id, {
            avatarUrl: profile.avatarUrl,
          });
          user.avatarUrl = profile.avatarUrl;
        }

        return { user, isNewUser, identity };
      }
    }

    // No existing user found, create a new one
    isNewUser = true;

    // Create a new user with data from OAuth profile
    const userData = {
      email:
        profile.email || `${profile.id}@${provider}.noreply.streamflix.com`,
      firstName: profile.firstName || profile.name?.split(' ')[0] || null,
      lastName:
        profile.lastName || profile.name?.split(' ').slice(1).join(' ') || null,
      emailVerified: !!profile.email, // Mark as verified if we got an email from OAuth provider
      avatarUrl: profile.avatarUrl,
      // No password for OAuth users
    };

    user = await this.usersService.create(userData);

    // Create OAuth identity for new user
    const identity = await this.saveIdentity(
      user.id,
      provider,
      profile,
      tokens,
    );

    return { user, isNewUser, identity };
  }

  /**
   * Link an OAuth account to an existing user
   */
  async linkAccount(
    userId: string,
    provider: string,
    profile: OAuthUserProfile,
    tokens: { accessToken: string; refreshToken?: string; expiresIn?: number },
  ): Promise<OAuthIdentity> {
    // Check if this OAuth identity is already linked to another account
    const existingIdentity = await this.findIdentity(provider, profile.id);

    if (existingIdentity && existingIdentity.userId !== userId) {
      throw new Error('This account is already linked to another user');
    }

    // Create or update the identity
    return this.saveIdentity(userId, provider, profile, tokens);
  }

  /**
   * Unlink an OAuth account from a user
   */
  async unlinkAccount(userId: string, provider: string): Promise<boolean> {
    const identities = await this.oauthIdentityRepository.find({
      where: { userId },
    });

    // Don't allow unlinking if it's the only identity and user has no password
    if (identities.length === 1) {
      const user = await this.usersService.findById(userId);

      // Check if this is an OAuth-only user without password
      if (!user.password) {
        throw new Error(
          'Cannot unlink the only authentication method. Please set a password first.',
        );
      }
    }

    const result = await this.oauthIdentityRepository.delete({
      userId,
      provider,
    });

    return result.affected > 0;
  }

  /**
   * Get all linked OAuth identities for a user
   */
  async getUserIdentities(userId: string): Promise<OAuthIdentity[]> {
    return this.oauthIdentityRepository.find({
      where: { userId },
      order: { provider: 'ASC' },
    });
  }
}
