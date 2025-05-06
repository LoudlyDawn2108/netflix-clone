import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { OAuthIdentity } from './entities/oauth-identity.entity';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { UserRoleController } from './controllers/user-role.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, OAuthIdentity])],
  providers: [UsersService, PermissionService, RoleService],
  exports: [UsersService, PermissionService, RoleService],
  controllers: [
    UsersController,
    PermissionController,
    RoleController,
    UserRoleController,
  ],
})
export class UsersModule {}
