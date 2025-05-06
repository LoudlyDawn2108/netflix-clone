import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { JwksController } from './jwks.controller';
import { ThrottlerModule } from './throttler/throttler.module';

@Module({
  imports: [ConfigModule, ThrottlerModule],
  controllers: [JwksController],
  providers: [PasswordService, JwtService],
  exports: [PasswordService, JwtService, ThrottlerModule],
})
export class SecurityModule {}
