import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserEventsService } from './user.events';
import { UserEventListener } from './user-event.listener';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Global events configuration
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    AuditModule,
  ],
  providers: [UserEventsService, UserEventListener],
  exports: [UserEventsService],
})
export class EventsModule {}
