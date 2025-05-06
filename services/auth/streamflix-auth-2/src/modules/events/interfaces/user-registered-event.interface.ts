import { BaseEvent } from './base-event.interface';

export interface UserRegisteredEvent extends BaseEvent {
  type: 'user.registered';
  data: {
    userId: string;
    email: string;
    emailVerified: boolean;
    firstName?: string;
    lastName?: string;
    registeredAt: Date;
  };
}
