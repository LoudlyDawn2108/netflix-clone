import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { AuditModule } from '../common/audit/audit.module';
import { EventsModule } from '../common/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission]),
    EventEmitterModule.forRoot(),
    AuditModule,
    EventsModule,
  ],
  providers: [UserRepository, RoleRepository, PermissionRepository],
  exports: [
    TypeOrmModule,
    UserRepository,
    RoleRepository,
    PermissionRepository,
  ],
})
export class DatabaseModule {}
