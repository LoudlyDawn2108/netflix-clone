import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { RoleService } from '../../modules/users/services/role.service';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the required permissions from the route handler
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get the user from the request object
    const { user } = context.switchToHttp().getRequest();

    // Make sure we have a user
    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    // If the user is using the legacy role system (no roles array) or has no roles assigned
    if (!user.roles || user.roles.length === 0) {
      // Use direct permission check from User entity
      for (const permission of requiredPermissions) {
        if (user.hasPermission && user.hasPermission(permission)) {
          return true;
        }
      }

      // For legacy role system, map known roles to permissions
      if (user.role) {
        if (user.role === 'super_admin' || user.role === 'admin') {
          return true; // Admin and super admin can do everything
        }

        // Handle the content_manager/support roles
        if (user.role === 'content_manager') {
          // Check if permission is content related
          if (requiredPermissions.some((p) => p.includes('content'))) {
            return true;
          }
        }

        if (user.role === 'support') {
          // Check if permission is for viewing users
          if (requiredPermissions.includes('view:users')) {
            return true;
          }
        }
      }

      this.logger.debug(
        `Permission denied for user ${user.id}: ${requiredPermissions.join(', ')}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    // For users with the new RBAC roles
    try {
      // Get all permissions from all roles, including inherited permissions
      const allPermissions = [];

      // First, collect direct role permissions
      for (const role of user.roles) {
        if (role.permissions) {
          allPermissions.push(...role.permissions);
        }

        // Get permissions from role hierarchy if not already loaded
        if (!role.permissions || role.permissions.length === 0) {
          const permissions = await this.roleService.getAllPermissionsForRole(
            role.id,
          );
          allPermissions.push(...permissions);
        }
      }

      // Check if the user has any of the required permissions
      const hasPermission = requiredPermissions.some((permission) =>
        allPermissions.some((p) => p.name === permission),
      );

      if (!hasPermission) {
        this.logger.debug(
          `Permission denied for user ${user.id}: ${requiredPermissions.join(', ')}`,
        );
        throw new ForbiddenException(
          'You do not have permission to access this resource',
        );
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error checking permissions for user ${user.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
