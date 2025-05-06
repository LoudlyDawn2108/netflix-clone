import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../modules/users/enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the route handler
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get the user from the request object
    const { user } = context.switchToHttp().getRequest();

    // Make sure we have a user
    if (!user) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    // Check if using the legacy role system
    if (!user.roles || user.roles.length === 0) {
      // Make sure we have a role
      if (!user.role) {
        this.logger.debug(
          `Role check failed for user ${user.id}: No role assigned`,
        );
        throw new ForbiddenException(
          'You do not have permission to access this resource',
        );
      }

      // Check if the user's role is in the required roles
      const hasRequiredRole = requiredRoles.some((role) => user.role === role);

      if (!hasRequiredRole) {
        this.logger.debug(
          `Role check failed for user ${user.id}: Has role ${user.role} but needs one of ${requiredRoles.join(', ')}`,
        );
        throw new ForbiddenException(
          'You do not have permission to access this resource',
        );
      }

      return true;
    }

    // For users with the new RBAC roles
    // Check if any of the user's roles match the required roles by name
    const userRoleNames = user.roles.map((role) => role.name);

    // Map the UserRole enum values to expected role names in our system
    const roleMapping = {
      [UserRole.USER]: 'basic-user',
      [UserRole.CONTENT_MANAGER]: 'content-manager',
      [UserRole.SUPPORT]: 'support-agent',
      [UserRole.ADMIN]: 'admin',
      [UserRole.SUPER_ADMIN]: 'super-admin',
    };

    // Check if the user has any of the required roles
    const hasRequiredRole = requiredRoles.some((requiredRole) => {
      const mappedRoleName = roleMapping[requiredRole];
      return userRoleNames.includes(mappedRoleName);
    });

    if (!hasRequiredRole) {
      this.logger.debug(
        `Role check failed for user ${user.id}: Has roles ${userRoleNames.join(', ')} but needs one of ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
