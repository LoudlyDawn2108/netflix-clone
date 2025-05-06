import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CsrfService } from './csrf.service';
import { ThrottlerIpGuard } from './throttler-ip.guard';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('security.rateLimitTtl'),
        limit: config.get<number>('security.rateLimitMax'),
      }),
    }),
  ],
  providers: [
    // Apply IP-based rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerIpGuard,
    },
    CsrfService,
  ],
  exports: [CsrfService],
})
export class SecurityModule {}
