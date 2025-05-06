import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerService } from './throttler.service';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [ThrottlerService],
  exports: [ThrottlerService],
})
export class ThrottlerModule {}
