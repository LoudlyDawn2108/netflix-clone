import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { EmailModule } from '../email/email.module';
import { CacheModule } from '../../core/cache/cache.module';
import { PasswordPolicyService } from './services/password-policy.service';
import { EventsModule } from '../events/events.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthIdentity } from '../users/entities/oauth-identity.entity';
import { OAuthService } from './services/oauth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GitHubStrategy } from './strategies/github.strategy';

// Enterprise features
import { ComplianceAuditService } from './services/compliance-audit.service';
import { ComplianceAuditController } from './controllers/compliance-audit.controller';
import { LdapService } from './services/ldap.service';
import { LdapController } from './controllers/ldap.controller';
import { MultiRegionService } from './services/multi-region.service';
import { MultiRegionController } from './controllers/multi-region.controller';
import { SamlService } from './services/saml.service';
import { SamlController } from './controllers/saml.controller';
import { AuditLog } from './entities/audit-log.entity';
import { PrivacyConsent } from './entities/privacy-consent.entity';
import { DataExport } from './entities/data-export.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    CacheModule,
    EventsModule,
    PassportModule,
    TypeOrmModule.forFeature([
      OAuthIdentity,
      AuditLog,
      PrivacyConsent,
      DataExport,
      User, // Required for MultiRegionService
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: `${configService.get('jwt.accessExpirationTime')}s`,
        },
      }),
    }),
  ],
  controllers: [
    AuthController,
    // Enterprise controllers
    ComplianceAuditController,
    LdapController,
    MultiRegionController,
    SamlController,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    PasswordPolicyService,
    OAuthService,
    GoogleStrategy,
    GitHubStrategy,
    // Enterprise providers
    ComplianceAuditService,
    LdapService,
    MultiRegionService,
    SamlService,
  ],
  exports: [
    AuthService,
    PasswordPolicyService,
    OAuthService,
    // Export enterprise services for use in other modules
    ComplianceAuditService,
    LdapService,
    MultiRegionService,
    SamlService,
  ],
})
export class AuthModule {}
