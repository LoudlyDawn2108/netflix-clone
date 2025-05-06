import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRepository } from '../../../database/repositories/user.repository';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // If no user object exists, access is denied
    if (!user) {
      this.logger.debug('Access denied: No user object found in request');
      throw new ForbiddenException('User information not found');
    }

    // Fetch user permissions from database
    try {
      const userWithPermissions =
        await this.userRepository.findOneWithPermissions(user.userId);

      if (!userWithPermissions) {
        this.logger.debug(`User ${user.userId} not found in database`);
        throw new ForbiddenException('User not found');
      }

      // Flatten the permissions from user's roles
      const userPermissions = userWithPermissions.roles.flatMap((role) =>
        role.permissions.map((permission) => permission.name),
      );

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasPermission) {
        this.logger.debug(
          `Access denied: User lacks required permissions: ${requiredPermissions.join(', ')}`,
        );
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    } catch (error) {
      this.logger.error(`Error checking permissions: ${error.message}`);
      throw new ForbiddenException('Error checking permissions');
    }
  }
}
