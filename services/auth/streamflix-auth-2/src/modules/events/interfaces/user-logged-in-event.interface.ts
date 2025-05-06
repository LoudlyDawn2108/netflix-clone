import { BaseEvent } from './base-event.interface';

export interface UserLoggedInEvent extends BaseEvent {
  type: 'user.logged_in';
  data: {
    userId: string;
    email: string;
    timestamp: Date;
    deviceInfo?: {
      ip?: string;
      userAgent?: string;
      deviceType?: string;
    };
  };
}
