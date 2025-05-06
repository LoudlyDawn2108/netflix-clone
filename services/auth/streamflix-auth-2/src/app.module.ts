import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DatabaseModule } from './core/database/database.module';
import { CacheModule } from './core/cache/cache.module';
import { SecurityModule } from './core/security/security.module';
import { EventsModule } from './modules/events/events.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule } from './core/logging/logging.module';
import { MonitoringModule } from './core/monitoring/monitoring.module';
import { configValidationSchema, configuration } from './config/configuration';
import { RBACSeeder } from './database/seeds/rbac.seed';
import { PermissionGuard } from './common/guards/permission.guard';
import { RoleService } from './modules/users/services/role.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      load: [configuration],
    }),

    // Core modules
    LoggingModule,
    MonitoringModule,
    DatabaseModule,
    CacheModule,
    SecurityModule,

    // Feature modules
    AuthModule,
    UsersModule,
    EventsModule,
    EmailModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RBACSeeder,
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
