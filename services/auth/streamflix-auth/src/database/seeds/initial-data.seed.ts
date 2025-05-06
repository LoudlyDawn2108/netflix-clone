import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

export default class InitialDataSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    // Get repositories
    const roleRepository = dataSource.getRepository(Role);
    const permissionRepository = dataSource.getRepository(Permission);

    // Define base permissions
    const permissions = [
      // User management
      {
        name: 'user:read',
        description: 'Can view users',
        resource: 'user',
        action: 'read',
      },
      {
        name: 'user:create',
        description: 'Can create users',
        resource: 'user',
        action: 'create',
      },
      {
        name: 'user:update',
        description: 'Can update users',
        resource: 'user',
        action: 'update',
      },
      {
        name: 'user:delete',
        description: 'Can delete users',
        resource: 'user',
        action: 'delete',
      },

      // Role management
      {
        name: 'role:read',
        description: 'Can view roles',
        resource: 'role',
        action: 'read',
      },
      {
        name: 'role:create',
        description: 'Can create roles',
        resource: 'role',
        action: 'create',
      },
      {
        name: 'role:update',
        description: 'Can update roles',
        resource: 'role',
        action: 'update',
      },
      {
        name: 'role:delete',
        description: 'Can delete roles',
        resource: 'role',
        action: 'delete',
      },

      // Permission management
      {
        name: 'permission:read',
        description: 'Can view permissions',
        resource: 'permission',
        action: 'read',
      },
      {
        name: 'permission:assign',
        description: 'Can assign permissions',
        resource: 'permission',
        action: 'assign',
      },

      // Content management
      {
        name: 'content:read',
        description: 'Can view content',
        resource: 'content',
        action: 'read',
      },
      {
        name: 'content:create',
        description: 'Can create content',
        resource: 'content',
        action: 'create',
      },
      {
        name: 'content:update',
        description: 'Can update content',
        resource: 'content',
        action: 'update',
      },
      {
        name: 'content:delete',
        description: 'Can delete content',
        resource: 'content',
        action: 'delete',
      },
    ];

    // Create permissions
    const savedPermissions: Permission[] = [];
    for (const permissionData of permissions) {
      const existingPermission = await permissionRepository.findOne({
        where: { name: permissionData.name },
      });

      if (!existingPermission) {
        const permission = permissionRepository.create(permissionData);
        const savedPermission = await permissionRepository.save(permission);
        savedPermissions.push(savedPermission);
      } else {
        savedPermissions.push(existingPermission);
      }
    }

    // Define roles with their permissions
    const roles = [
      {
        name: 'admin',
        description: 'Administrator with full access',
        permissions: savedPermissions, // All permissions
      },
      {
        name: 'user',
        description: 'Standard user',
        permissions: savedPermissions.filter(
          (p) => p.name === 'content:read' || p.name === 'user:read',
        ),
      },
      {
        name: 'content-manager',
        description: 'Content manager with access to content features',
        permissions: savedPermissions.filter((p) =>
          p.name.startsWith('content:'),
        ),
      },
    ];

    // Create roles
    for (const roleData of roles) {
      const existingRole = await roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
        });

        await roleRepository.save(role);
      } else {
        // Update existing role's permissions
        existingRole.permissions = roleData.permissions;
        await roleRepository.save(existingRole);
      }
    }
  }
}
