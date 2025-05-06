import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BaseEvent } from './interfaces/base-event.interface';
import { UserRegisteredEvent } from './interfaces/user-registered-event.interface';
import { UserLoggedInEvent } from './interfaces/user-logged-in-event.interface';
import { PasswordResetRequestedEvent } from './interfaces/password-reset-requested-event.interface';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from './services/outbox.service';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly serviceName: string;
  private readonly serviceVersion: string;

  constructor(
    private configService: ConfigService,
    private outboxService: OutboxService,
    private dataSource: DataSource,
  ) {
    this.serviceName = this.configService.get('app.name', 'auth-service');
    this.serviceVersion = this.configService.get('app.version', '1.0.0');
  }

  /**
   * Create base event properties
   */
  private createBaseEvent(type: string): BaseEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: new Date(),
      version: this.serviceVersion,
      producer: this.serviceName,
    };
  }

  /**
   * Publish user registered event and store in outbox
   */
  async publishUserRegistered(
    user: User,
    metadata?: { source?: string; isJIT?: boolean },
  ): Promise<void> {
    const eventPayload = {
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      registeredAt: user.createdAt,
      source: metadata?.source || 'direct',
      isJIT: metadata?.isJIT || false,
    };

    await this.outboxService.createOutboxEntry('user.registered', eventPayload);

    // Log the event for debugging
    this.logger.log(`User registered event queued for user: ${user.id}`);
  }

  /**
   * Publish user logged in event and store in outbox
   */
  async publishUserLoggedIn(
    user: User,
    metadata?: {
      ip?: string;
      userAgent?: string;
      deviceType?: string;
      method?: string;
      jit?: boolean;
    },
  ): Promise<void> {
    const eventPayload = {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
      deviceInfo: {
        ip: metadata?.ip || 'unknown',
        userAgent: metadata?.userAgent || 'unknown',
        deviceType: metadata?.deviceType || 'unknown',
      },
      method: metadata?.method || 'email',
      isJIT: metadata?.jit || false,
    };

    await this.outboxService.createOutboxEntry('user.logged_in', eventPayload);

    // Log the event for debugging
    this.logger.log(`User login event queued for user: ${user.id}`);
  }

  /**
   * Publish password reset requested event and store in outbox
   */
  async publishPasswordResetRequested(
    user: User,
    expiresAt: Date,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const eventPayload = {
      userId: user.id,
      email: user.email,
      requestedAt: new Date(),
      expiresAt,
      requestMetadata: {
        ip: metadata?.ip || 'unknown',
        userAgent: metadata?.userAgent || 'unknown',
      },
    };

    await this.outboxService.createOutboxEntry(
      'user.password_reset_requested',
      eventPayload,
    );

    // Log the event for debugging
    this.logger.log(`Password reset request event queued for user: ${user.id}`);
  }

  /**
   * Create a transaction-bound outbox entry
   * Use this inside a transaction to ensure the event is only published if the transaction succeeds
   */
  async createOutboxEntryInTransaction(
    type: string,
    payload: Record<string, any>,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await this.outboxService.createOutboxEntry(type, payload, queryRunner);
    this.logger.debug(`Outbox entry created in transaction: ${type}`);
  }

  // Legacy compatibility methods for backward compatibility
  async emitUserRegistered(user: User, metadata?: any): Promise<void> {
    return this.publishUserRegistered(user, metadata);
  }

  async emitUserLoggedIn(user: User, metadata?: any): Promise<void> {
    return this.publishUserLoggedIn(user, metadata);
  }

  // Additional compatibility methods to maintain backward compatibility
  async emitSessionCreated(data: any): Promise<void> {
    // Session creation events are handled by the login event
    return Promise.resolve();
  }

  async emitSessionDestroyed(data: any): Promise<void> {
    // Not needed for the current outbox implementation
    return Promise.resolve();
  }

  async emitSessionRefreshed(data: any): Promise<void> {
    // Not needed for the current outbox implementation
    return Promise.resolve();
  }

  async emitPasswordChanged(data: any): Promise<void> {
    // Not needed for the current outbox implementation
    return Promise.resolve();
  }

  async emitAccountLocked(data: any): Promise<void> {
    // Not needed for the current outbox implementation
    return Promise.resolve();
  }

  async emitAccountUnlocked(data: any): Promise<void> {
    // Not needed for the current outbox implementation
    return Promise.resolve();
  }
}
