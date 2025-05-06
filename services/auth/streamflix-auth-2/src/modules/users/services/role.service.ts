import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import { PermissionService } from './permission.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleResponseDto,
  AssignPermissionsDto,
} from '../dto/role.dto';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly permissionService: PermissionService,
  ) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepository.find({
      relations: ['permissions'],
    });
    return roles;
  }

  async findById(id: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async findByName(name: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role with name ${name} not found`);
    }

    return role;
  }

  async create(createDto: CreateRoleDto): Promise<RoleResponseDto> {
    // Check for existing role with same name
    const existing = await this.roleRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Role with name ${createDto.name} already exists`,
      );
    }

    // Check parent role if specified
    if (createDto.parentId) {
      const parentRole = await this.roleRepository.findOne({
        where: { id: createDto.parentId },
      });

      if (!parentRole) {
        throw new NotFoundException(
          `Parent role with ID ${createDto.parentId} not found`,
        );
      }
    }

    // Create role instance
    const role = this.roleRepository.create({
      name: createDto.name,
      description: createDto.description,
      isSystem: createDto.isSystem || false,
      parentId: createDto.parentId,
    });

    // Save basic role first
    const savedRole = await this.roleRepository.save(role);

    // Add permissions if specified
    if (createDto.permissionIds && createDto.permissionIds.length > 0) {
      const permissions = await this.permissionService.findByIds(
        createDto.permissionIds,
      );
      savedRole.permissions = permissions;
      await this.roleRepository.save(savedRole);
    }

    return this.findById(savedRole.id);
  }

  async update(id: string, updateDto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.findById(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    // Check parent role if specified
    if (updateDto.parentId) {
      // Check for circular references
      if (updateDto.parentId === id) {
        throw new BadRequestException('A role cannot be its own parent');
      }

      const parentRole = await this.roleRepository.findOne({
        where: { id: updateDto.parentId },
      });

      if (!parentRole) {
        throw new NotFoundException(
          `Parent role with ID ${updateDto.parentId} not found`,
        );
      }

      // Check if parent would create circular reference
      const parentChain = await this.getParentChain(updateDto.parentId);
      if (parentChain.some((parent) => parent.id === id)) {
        throw new BadRequestException('Circular role hierarchy is not allowed');
      }
    }

    const updated = this.roleRepository.merge(role, updateDto);
    await this.roleRepository.save(updated);

    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findById(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Check if this role is a parent to other roles
    const childRoles = await this.roleRepository.find({
      where: { parentId: id },
    });

    if (childRoles.length > 0) {
      throw new BadRequestException(
        'Cannot delete role that is parent to other roles',
      );
    }

    // Check if this role is assigned to any users
    const usersWithRole = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.id = :roleId', { roleId: id })
      .getCount();

    if (usersWithRole > 0) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users',
      );
    }

    await this.roleRepository.remove(role);
  }

  async assignPermissions(
    id: string,
    dto: AssignPermissionsDto,
  ): Promise<RoleResponseDto> {
    const role = await this.findById(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    const permissions = await this.permissionService.findByIds(
      dto.permissionIds,
    );
    role.permissions = permissions;
    await this.roleRepository.save(role);

    return this.findById(id);
  }

  async removePermission(
    roleId: string,
    permissionId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.findById(roleId);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (!role.permissions) {
      throw new BadRequestException('Role does not have any permissions');
    }

    role.permissions = role.permissions.filter(
      (permission) => permission.id !== permissionId,
    );
    await this.roleRepository.save(role);

    return this.findById(roleId);
  }

  // Get all parent roles in hierarchy chain
  async getParentChain(roleId: string): Promise<Role[]> {
    const result: Role[] = [];
    let currentRole = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    while (currentRole && currentRole.parentId) {
      const parentRole = await this.roleRepository.findOne({
        where: { id: currentRole.parentId },
      });

      if (!parentRole) {
        break;
      }

      result.push(parentRole);
      currentRole = parentRole;

      // Safety check to prevent infinite loops if there's a circular reference in the database
      if (result.some((r) => r.id === parentRole.id)) {
        this.logger.warn(
          `Circular reference detected in role hierarchy for role ${roleId}`,
        );
        break;
      }
    }

    return result;
  }

  // Get all permissions for a role, including those inherited from parent roles
  async getAllPermissionsForRole(roleId: string): Promise<Permission[]> {
    const role = await this.findById(roleId);
    const permissions = [...(role.permissions || [])];

    // Get permissions from parent chain
    const parentChain = await this.getParentChain(roleId);
    for (const parentRole of parentChain) {
      const parentRoleWithPermissions = await this.roleRepository.findOne({
        where: { id: parentRole.id },
        relations: ['permissions'],
      });

      if (parentRoleWithPermissions && parentRoleWithPermissions.permissions) {
        // Add parent permissions avoiding duplicates
        parentRoleWithPermissions.permissions.forEach((permission) => {
          if (!permissions.some((p) => p.id === permission.id)) {
            permissions.push(permission);
          }
        });
      }
    }

    return permissions;
  }

  // Associate default roles with system UserRoles
  async getUserRoleToSystemRoleMapping(): Promise<Map<UserRole, string>> {
    const mapping = new Map<UserRole, string>();

    // Create the mapping between UserRole enum and system roles
    mapping.set(UserRole.USER, 'basic-user');
    mapping.set(UserRole.CONTENT_MANAGER, 'content-manager');
    mapping.set(UserRole.SUPPORT, 'support-agent');
    mapping.set(UserRole.ADMIN, 'admin');
    mapping.set(UserRole.SUPER_ADMIN, 'super-admin');

    return mapping;
  }

  // Create default system roles
  async createSystemRoles(): Promise<void> {
    // Make sure permissions exist first
    await this.permissionService.createSystemPermissions();

    // Get all permissions to assign to roles
    const allPermissions = await this.permissionService.findAll();

    // Create basic user role
    await this.createOrUpdateSystemRole({
      name: 'basic-user',
      description: 'Regular user with basic permissions',
      permissions: await this.permissionService.findByNames([]),
      isSystem: true,
    });

    // Create content manager role
    await this.createOrUpdateSystemRole({
      name: 'content-manager',
      description: 'Can manage content in the system',
      permissions: await this.permissionService.findByNames(['manage:content']),
      isSystem: true,
    });

    // Create support role
    await this.createOrUpdateSystemRole({
      name: 'support-agent',
      description: 'Support personnel with limited user management',
      permissions: await this.permissionService.findByNames(['view:users']),
      isSystem: true,
      parentName: 'content-manager', // Inherits content-manager permissions
    });

    // Create admin role
    await this.createOrUpdateSystemRole({
      name: 'admin',
      description:
        'Administrator with all user and content management permissions',
      permissions: await this.permissionService.findByNames([
        'manage:users',
        'view:users',
        'create:users',
        'update:users',
        'delete:users',
        'view:roles',
      ]),
      isSystem: true,
      parentName: 'content-manager', // Inherits content-manager permissions
    });

    // Create super admin role
    await this.createOrUpdateSystemRole({
      name: 'super-admin',
      description: 'Super administrator with all permissions',
      permissions: allPermissions,
      isSystem: true,
    });
  }

  // Helper method to create or update system roles
  private async createOrUpdateSystemRole({
    name,
    description,
    permissions,
    isSystem,
    parentName,
  }: {
    name: string;
    description: string;
    permissions: Permission[];
    isSystem: boolean;
    parentName?: string;
  }): Promise<void> {
    let role = await this.roleRepository.findOne({
      where: { name },
    });

    // Get parent role if specified
    let parentId: string | undefined;
    if (parentName) {
      const parentRole = await this.roleRepository.findOne({
        where: { name: parentName },
      });

      if (parentRole) {
        parentId = parentRole.id;
      }
    }

    if (!role) {
      // Create new role
      role = this.roleRepository.create({
        name,
        description,
        isSystem,
        parentId,
      });

      role = await this.roleRepository.save(role);
    } else {
      // Update existing role
      role.description = description;
      role.isSystem = isSystem;
      role.parentId = parentId;

      role = await this.roleRepository.save(role);
    }

    // Assign permissions
    if (permissions && permissions.length > 0) {
      role.permissions = permissions;
      await this.roleRepository.save(role);
    }
  }
}
