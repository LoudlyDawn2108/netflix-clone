import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SecurityModule } from '../common/security/security.module';
import { RedisModule } from '../common/redis/redis.module';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../common/email/email.module';
import { AuditService } from '../common/audit/audit.service';
import { AuditModule } from '../common/audit/audit.module';
import { EventsModule } from '../common/events/events.module';
import { ThrottlerModule } from '../common/security/throttler/throttler.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenService } from './token.service';
import { PasswordHistoryService } from './password-history.service';
import { VerificationTokenService } from './verification-token.service';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { EmailUniquePipe } from './pipes/email-unique.pipe';
import { UsernameUniquePipe } from './pipes/username-unique.pipe';
import { RegistrationValidationPipe } from './pipes/registration-validation.pipe';
import { PasswordStrengthConstraint } from './dto/validators/password-strength.validator';

@Module({
  imports: [
    ConfigModule,
    SecurityModule,
    RedisModule,
    DatabaseModule,
    EmailModule,
    ThrottlerModule,
    AuditModule,
    EventsModule,
    TypeOrmModule.forFeature([User, Role]),
  ],
  providers: [
    AuthService,
    TokenService,
    PasswordHistoryService,
    VerificationTokenService,
    EmailUniquePipe,
    UsernameUniquePipe,
    PasswordStrengthConstraint,
    {
      provide: RegistrationValidationPipe,
      useFactory: (userRepo, emailPipe) => {
        return new RegistrationValidationPipe(userRepo, emailPipe);
      },
      inject: [getRepositoryToken(User), EmailUniquePipe],
    },
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    TokenService,
    PasswordHistoryService,
    VerificationTokenService,
  ],
})
export class AuthModule {}
