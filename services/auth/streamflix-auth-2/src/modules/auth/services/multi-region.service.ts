import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Redis from 'redis';
import { EventsService } from '../../events/events.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class MultiRegionService implements OnModuleInit {
  private readonly logger = new Logger(MultiRegionService.name);
  private regionName: string;
  private primaryRegion: string;
  private isPrimary: boolean;
  private replicationEnabled: boolean;
  private syncEnabled: boolean;
  private publisher: Redis.RedisClientType;
  private subscriber: Redis.RedisClientType;
  private regions: string[] = [];
  private channelPrefix = 'auth-sync';

  constructor(
    private readonly configService: ConfigService,
    private readonly eventsService: EventsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    // Initialize configuration
    this.regionName = this.configService.get('app.region') || 'default';
    this.primaryRegion =
      this.configService.get('multiRegion.primaryRegion') || 'default';
    this.isPrimary = this.regionName === this.primaryRegion;
    this.replicationEnabled =
      this.configService.get('multiRegion.replicationEnabled') || false;
    this.syncEnabled =
      this.configService.get('multiRegion.syncEnabled') || false;
    this.regions = this.configService.get('multiRegion.regions') || [
      this.regionName,
    ];

    if (this.syncEnabled) {
      await this.initializeRedisChannels();
    }

    this.logger.log(`Multi-region mode initialized: 
      - Region: ${this.regionName}
      - Primary: ${this.isPrimary ? 'Yes' : 'No'} 
      - Replication: ${this.replicationEnabled ? 'Enabled' : 'Disabled'}
      - Session Sync: ${this.syncEnabled ? 'Enabled' : 'Disabled'}
      - Regions: ${this.regions.join(', ')}`);
  }

  /**
   * Initialize Redis pub/sub clients for cross-region session synchronization
   */
  private async initializeRedisChannels() {
    try {
      const redisUrl = this.configService.get('redis.url');

      // Initialize publisher client
      this.publisher = Redis.createClient({
        url: redisUrl,
      });
      await this.publisher.connect();

      // Initialize subscriber client
      this.subscriber = Redis.createClient({
        url: redisUrl,
      });
      await this.subscriber.connect();

      // Subscribe to session events from other regions
      await this.subscriber.subscribe(
        `${this.channelPrefix}:session:*`,
        (message, channel) => {
          try {
            if (!channel.includes(`:${this.regionName}:`)) {
              // Ignore messages from this region
              const event = JSON.parse(message);
              this.handleSessionEvent(event);
            }
          } catch (error) {
            this.logger.error(
              `Error handling session sync message: ${error.message}`,
              error.stack,
            );
          }
        },
      );

      // Subscribe to user data replication events
      if (this.replicationEnabled) {
        await this.subscriber.subscribe(
          `${this.channelPrefix}:user:*`,
          (message, channel) => {
            try {
              if (!channel.includes(`:${this.regionName}:`)) {
                // Ignore messages from this region
                const event = JSON.parse(message);
                this.handleUserDataEvent(event);
              }
            } catch (error) {
              this.logger.error(
                `Error handling user data sync message: ${error.message}`,
                error.stack,
              );
            }
          },
        );
      }

      this.logger.log(
        'Redis pub/sub channels initialized for multi-region sync',
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Redis channels: ${error.message}`,
        error.stack,
      );
      // Fall back to non-sync mode if Redis fails
      this.syncEnabled = false;
    }
  }

  /**
   * Publish a session event to other regions
   */
  async publishSessionEvent(type: string, data: any): Promise<void> {
    if (!this.syncEnabled || !this.publisher) return;

    try {
      const event = {
        type,
        region: this.regionName,
        timestamp: new Date().toISOString(),
        data,
      };

      await this.publisher.publish(
        `${this.channelPrefix}:session:${this.regionName}:${type}`,
        JSON.stringify(event),
      );

      this.logger.debug(
        `Published session event: ${type} for user ${data.userId || 'unknown'}`,
      );
    } catch (error) {
      this.logger.error(
        `Error publishing session event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle session event from another region
   */
  private async handleSessionEvent(event: any): Promise<void> {
    try {
      this.logger.debug(
        `Received session event from ${event.region}: ${event.type}`,
      );

      switch (event.type) {
        case 'login':
          // Handle login from another region
          if (event.data?.userId && event.data?.sessionId) {
            await this.eventsService.emitSessionCreated({
              userId: event.data.userId,
              sessionId: event.data.sessionId,
              sourceRegion: event.region,
            });
          }
          break;

        case 'logout':
          // Handle logout from another region
          if (event.data?.userId && event.data?.sessionId) {
            await this.eventsService.emitSessionDestroyed({
              userId: event.data.userId,
              sessionId: event.data.sessionId,
              sourceRegion: event.region,
            });
          }
          break;

        case 'refresh':
          // Handle token refresh from another region
          if (event.data?.userId && event.data?.sessionId) {
            await this.eventsService.emitSessionRefreshed({
              userId: event.data.userId,
              sessionId: event.data.sessionId,
              sourceRegion: event.region,
            });
          }
          break;

        case 'password_change':
          // Handle password change from another region
          if (event.data?.userId) {
            await this.eventsService.emitPasswordChanged({
              userId: event.data.userId,
              sourceRegion: event.region,
            });
          }
          break;

        case 'account_locked':
          // Handle account locked from another region
          if (event.data?.userId) {
            await this.eventsService.emitAccountLocked({
              userId: event.data.userId,
              reason: event.data.reason || 'unknown',
              sourceRegion: event.region,
            });
          }
          break;

        case 'account_unlocked':
          // Handle account unlocked from another region
          if (event.data?.userId) {
            await this.eventsService.emitAccountUnlocked({
              userId: event.data.userId,
              sourceRegion: event.region,
            });
          }
          break;
      }
    } catch (error) {
      this.logger.error(
        `Error handling session event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Publish a user data event to other regions (for replication)
   */
  async publishUserDataEvent(type: string, data: any): Promise<void> {
    if (!this.replicationEnabled || !this.publisher) return;

    try {
      const event = {
        type,
        region: this.regionName,
        timestamp: new Date().toISOString(),
        data,
      };

      await this.publisher.publish(
        `${this.channelPrefix}:user:${this.regionName}:${type}`,
        JSON.stringify(event),
      );

      this.logger.debug(
        `Published user data event: ${type} for user ${data.id || 'unknown'}`,
      );
    } catch (error) {
      this.logger.error(
        `Error publishing user data event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle user data event from another region
   */
  private async handleUserDataEvent(event: any): Promise<void> {
    // Only handle user data events if replication is enabled
    if (!this.replicationEnabled) return;

    try {
      this.logger.debug(
        `Received user data event from ${event.region}: ${event.type}`,
      );

      switch (event.type) {
        case 'user_created':
          // Replicate new user
          if (event.data?.id && event.data?.email) {
            await this.replicateUser(event.data, true);
          }
          break;

        case 'user_updated':
          // Replicate user update
          if (event.data?.id) {
            await this.replicateUser(event.data, false);
          }
          break;

        case 'user_deleted':
          // Replicate user deletion
          if (event.data?.id) {
            await this.deleteReplicatedUser(event.data.id);
          }
          break;
      }
    } catch (error) {
      this.logger.error(
        `Error handling user data event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Replicate a user from another region
   */
  private async replicateUser(userData: any, isNew: boolean): Promise<void> {
    try {
      // Check if user already exists
      let user = await this.userRepository.findOne({
        where: { id: userData.id },
      });

      if (user) {
        // Update existing user
        user = this.userRepository.merge(user, {
          ...userData,
          updatedAt: new Date(),
          _replicatedFrom: userData._replicatedFrom || userData.region,
          _replicatedAt: new Date(),
        });
      } else if (isNew) {
        // Create new user
        user = this.userRepository.create({
          ...userData,
          _replicatedFrom: userData._replicatedFrom || userData.region,
          _replicatedAt: new Date(),
        });
      } else {
        // User doesn't exist and it's not a new user, something is wrong
        throw new Error(`Cannot update non-existent user: ${userData.id}`);
      }

      await this.userRepository.save(user);
      this.logger.debug(
        `Replicated user ${isNew ? 'creation' : 'update'} for ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error replicating user: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Delete a replicated user
   */
  private async deleteReplicatedUser(userId: string): Promise<void> {
    try {
      await this.userRepository.delete({ id: userId });
      this.logger.debug(`Deleted replicated user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error deleting replicated user: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Notify other regions of a user login
   */
  async notifyLogin(userId: string, sessionId: string): Promise<void> {
    await this.publishSessionEvent('login', { userId, sessionId });
  }

  /**
   * Notify other regions of a user logout
   */
  async notifyLogout(userId: string, sessionId: string): Promise<void> {
    await this.publishSessionEvent('logout', { userId, sessionId });
  }

  /**
   * Notify other regions of a token refresh
   */
  async notifyTokenRefresh(userId: string, sessionId: string): Promise<void> {
    await this.publishSessionEvent('refresh', { userId, sessionId });
  }

  /**
   * Notify other regions of a password change
   */
  async notifyPasswordChange(userId: string): Promise<void> {
    await this.publishSessionEvent('password_change', { userId });
  }

  /**
   * Notify other regions of an account lock
   */
  async notifyAccountLocked(userId: string, reason: string): Promise<void> {
    await this.publishSessionEvent('account_locked', { userId, reason });
  }

  /**
   * Notify other regions of an account unlock
   */
  async notifyAccountUnlocked(userId: string): Promise<void> {
    await this.publishSessionEvent('account_unlocked', { userId });
  }

  /**
   * Get current region name
   */
  getRegionName(): string {
    return this.regionName;
  }

  /**
   * Check if this is the primary region
   */
  isPrimaryRegion(): boolean {
    return this.isPrimary;
  }

  /**
   * Get all configured regions
   */
  getAllRegions(): string[] {
    return this.regions;
  }
}
