import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from '../dto/permission.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find();
    return permissions;
  }

  async findById(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  async findByName(name: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({
      where: { name },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with name ${name} not found`);
    }

    return permission;
  }

  async findByNames(names: string[]): Promise<Permission[]> {
    if (!names || names.length === 0) {
      return [];
    }

    const permissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .where('permission.name IN (:...names)', { names })
      .getMany();

    return permissions;
  }

  async create(createDto: CreatePermissionDto): Promise<PermissionResponseDto> {
    // Check for existing permission with same name
    const existing = await this.permissionRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Permission with name ${createDto.name} already exists`,
      );
    }

    const permission = this.permissionRepository.create(createDto);
    await this.permissionRepository.save(permission);

    return permission;
  }

  async update(
    id: string,
    updateDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.findById(id);

    if (permission.isSystem) {
      throw new BadRequestException('System permissions cannot be modified');
    }

    const updated = this.permissionRepository.merge(permission, updateDto);

    return this.permissionRepository.save(updated);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.findById(id);

    if (permission.isSystem) {
      throw new BadRequestException('System permissions cannot be deleted');
    }

    await this.permissionRepository.remove(permission);
  }

  // Get permissions by IDs
  async findByIds(ids: string[]): Promise<Permission[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const permissions = await this.permissionRepository.findByIds(ids);

    if (permissions.length !== ids.length) {
      const foundIds = permissions.map((p) => p.id);
      const missingIds = ids.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Could not find permissions with IDs: ${missingIds.join(', ')}`,
      );
    }

    return permissions;
  }

  // Find permissions by resource
  async findByResource(resource: string): Promise<PermissionResponseDto[]> {
    return this.permissionRepository.find({
      where: { resource },
    });
  }

  // Create default system permissions
  async createSystemPermissions(): Promise<void> {
    const defaultPermissions = [
      {
        name: 'manage:users',
        description: 'Can view and manage all users',
        resource: 'users',
        action: 'manage',
        isSystem: true,
      },
      {
        name: 'view:users',
        description: 'Can view user details',
        resource: 'users',
        action: 'read',
        isSystem: true,
      },
      {
        name: 'create:users',
        description: 'Can create new users',
        resource: 'users',
        action: 'create',
        isSystem: true,
      },
      {
        name: 'update:users',
        description: 'Can update user details',
        resource: 'users',
        action: 'update',
        isSystem: true,
      },
      {
        name: 'delete:users',
        description: 'Can delete users',
        resource: 'users',
        action: 'delete',
        isSystem: true,
      },
      {
        name: 'manage:roles',
        description: 'Can manage roles and permissions',
        resource: 'roles',
        action: 'manage',
        isSystem: true,
      },
      {
        name: 'view:roles',
        description: 'Can view roles',
        resource: 'roles',
        action: 'read',
        isSystem: true,
      },
      {
        name: 'manage:content',
        description: 'Can manage all content',
        resource: 'content',
        action: 'manage',
        isSystem: true,
      },
      {
        name: 'view:audit-logs',
        description: 'Can view security audit logs',
        resource: 'audit',
        action: 'read',
        isSystem: true,
      },
      {
        name: 'impersonate:users',
        description: 'Can impersonate other users',
        resource: 'users',
        action: 'impersonate',
        isSystem: true,
      },
    ];

    for (const permissionData of defaultPermissions) {
      const exists = await this.permissionRepository.findOne({
        where: { name: permissionData.name },
      });

      if (!exists) {
        const permission = this.permissionRepository.create(permissionData);
        await this.permissionRepository.save(permission);
      }
    }
  }
}
