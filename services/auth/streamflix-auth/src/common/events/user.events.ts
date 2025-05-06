import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../../database/entities/user.entity';

export enum UserEventTypes {
  CREATED = 'user.created',
  UPDATED = 'user.updated',
  DELETED = 'user.deleted',
  EMAIL_VERIFIED = 'user.email_verified',
  PASSWORD_CHANGED = 'user.password_changed',
  LOGGED_IN = 'user.logged_in',
  LOCKED = 'user.locked',
  UNLOCKED = 'user.unlocked',
}

export interface UserEvent {
  type: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Service for emitting user-related events
 */
@Injectable()
export class UserEventsService {
  private readonly logger = new Logger(UserEventsService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a user created event
   * @param user The created user
   * @param metadata Additional metadata
   */
  emitUserCreated(user: User, metadata?: Record<string, any>): void {
    try {
      const event: UserEvent = {
        type: UserEventTypes.CREATED,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          email: user.email,
          username: user.username,
          isEmailVerified: user.isEmailVerified,
          ...metadata,
        },
      };

      this.eventEmitter.emit(UserEventTypes.CREATED, event);
      this.logger.debug(
        `Emitted ${UserEventTypes.CREATED} event for user ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit ${UserEventTypes.CREATED} event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emit a user updated event
   * @param user The updated user
   * @param changes The changes that were made
   */
  emitUserUpdated(user: User, changes: Partial<User>): void {
    try {
      const event: UserEvent = {
        type: UserEventTypes.UPDATED,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          changes: Object.keys(changes).filter(
            (key) => !['password', 'passwordHistory'].includes(key),
          ),
        },
      };

      this.eventEmitter.emit(UserEventTypes.UPDATED, event);
      this.logger.debug(
        `Emitted ${UserEventTypes.UPDATED} event for user ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit ${UserEventTypes.UPDATED} event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emit a user email verified event
   * @param user The user whose email was verified
   */
  emitEmailVerified(user: User): void {
    try {
      const event: UserEvent = {
        type: UserEventTypes.EMAIL_VERIFIED,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          email: user.email,
        },
      };

      this.eventEmitter.emit(UserEventTypes.EMAIL_VERIFIED, event);
      this.logger.debug(
        `Emitted ${UserEventTypes.EMAIL_VERIFIED} event for user ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit ${UserEventTypes.EMAIL_VERIFIED} event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emit a user password changed event
   * @param userId The ID of the user
   */
  emitPasswordChanged(userId: string): void {
    try {
      const event: UserEvent = {
        type: UserEventTypes.PASSWORD_CHANGED,
        userId,
        timestamp: new Date(),
      };

      this.eventEmitter.emit(UserEventTypes.PASSWORD_CHANGED, event);
      this.logger.debug(
        `Emitted ${UserEventTypes.PASSWORD_CHANGED} event for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit ${UserEventTypes.PASSWORD_CHANGED} event: ${error.message}`,
        error.stack,
      );
    }
  }
}
