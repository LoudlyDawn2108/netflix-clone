import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { TokenSchema } from './schema/token.schema';

@Module({
  imports: [ConfigModule],
  providers: [RedisService, TokenSchema],
  exports: [RedisService, TokenSchema],
})
export class RedisModule {}
