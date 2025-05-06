import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { OutboxService } from './services/outbox.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Outbox } from './entities/outbox.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Outbox]),
    ScheduleModule.forRoot(),
  ],
  providers: [EventsService, OutboxService],
  exports: [EventsService],
})
export class EventsModule {}
