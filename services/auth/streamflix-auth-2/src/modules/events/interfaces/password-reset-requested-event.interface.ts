import { BaseEvent } from './base-event.interface';

export interface PasswordResetRequestedEvent extends BaseEvent {
  type: 'user.password_reset_requested';
  data: {
    userId: string;
    email: string;
    requestedAt: Date;
    expiresAt: Date;
    requestMetadata?: {
      ip?: string;
      userAgent?: string;
    };
  };
}
