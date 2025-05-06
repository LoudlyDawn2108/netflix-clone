import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserEvent } from './user.events';
import { AuditService } from '../audit/audit.service';

/**
 * Service that listens to user-related events and performs follow-up actions
 */
@Injectable()
export class UserEventListener {
  private readonly logger = new Logger(UserEventListener.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Handle user created events
   * @param event The user created event
   */
  @OnEvent('user.created')
  handleUserCreatedEvent(event: UserEvent): void {
    try {
      this.logger.debug(
        `Handling ${event.type} event for user ${event.userId}`,
      );

      // Additional business logic can be performed here
      // For example:
      // - Analytics tracking
      // - User onboarding workflows
      // - Integration with external systems
      // - Compliance reporting

      // Extended audit logging with correlation tracking
      if (event.metadata?.correlationId) {
        this.auditService.logSecurityEvent(
          'USER_REGISTRATION_PROCESSED',
          event.userId,
          {
            correlationId: event.metadata?.correlationId as string,
            source: (event.metadata?.source as string) || 'auth-service',
            eventId:
              (event.metadata?.eventId as string) || `event-${Date.now()}`,
            eventVersion: (event.metadata?.eventVersion as string) || '1.0',
          },
          event.metadata?.ipAddress as string | undefined,
        );
      }

      this.logger.debug(
        `Successfully processed ${event.type} event for user ${event.userId}`,
      );
    } catch (error) {
      // Ensure event handling failures don't propagate up
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error handling ${event.type} event for user ${event.userId}: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Handle email verified events
   * @param event The email verified event
   */
  @OnEvent('user.email_verified')
  handleEmailVerifiedEvent(event: UserEvent): void {
    try {
      this.logger.debug(
        `Handling ${event.type} event for user ${event.userId}`,
      );

      // Email verification follow-up actions here
      // For example:
      // - Update user status in other systems
      // - Trigger welcome email sequences
      // - Award signup bonuses

      this.logger.debug(
        `Successfully processed ${event.type} event for user ${event.userId}`,
      );
    } catch (error) {
      // Ensure event handling failures don't propagate up
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error handling ${event.type} event for user ${event.userId}: ${errorMessage}`,
        errorStack,
      );
    }
  }
}
