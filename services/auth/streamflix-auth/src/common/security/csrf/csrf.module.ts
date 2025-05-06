import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CsrfService } from './csrf.service';
import { CsrfGuard } from './csrf.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [ConfigModule],
  providers: [
    CsrfService,
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
  exports: [CsrfService],
})
export class CsrfModule {}
