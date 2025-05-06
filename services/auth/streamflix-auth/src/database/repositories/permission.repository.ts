import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async findById(id: string): Promise<Permission | null> {
    return this.permissionRepo.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.permissionRepo.findOne({ where: { name } });
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepo.find();
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return this.permissionRepo.find({ where: { resource } });
  }

  async findByAction(action: string): Promise<Permission[]> {
    return this.permissionRepo.find({ where: { action } });
  }

  async createPermission(
    permissionData: Partial<Permission>,
  ): Promise<Permission> {
    const permission = this.permissionRepo.create(permissionData);
    return this.permissionRepo.save(permission);
  }

  async updatePermission(
    id: string,
    permissionData: Partial<Permission>,
  ): Promise<Permission | null> {
    await this.permissionRepo.update(id, permissionData);
    return this.findById(id);
  }

  async deletePermission(id: string): Promise<boolean> {
    const result = await this.permissionRepo.delete(id);
    return (
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0
    );
  }

  async findByResourceAndAction(
    resource: string,
    action: string,
  ): Promise<Permission | null> {
    return this.permissionRepo.findOne({
      where: {
        resource,
        action,
      },
    });
  }

  async count(): Promise<number> {
    return this.permissionRepo.count();
  }
}
