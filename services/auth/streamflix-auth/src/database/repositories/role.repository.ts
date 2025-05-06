import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } });
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepo.find();
  }

  async createRole(roleData: Partial<Role>): Promise<Role> {
    const role = this.roleRepo.create(roleData);
    return this.roleRepo.save(role);
  }

  async updateRole(id: string, roleData: Partial<Role>): Promise<Role | null> {
    await this.roleRepo.update(id, roleData);
    return this.findById(id);
  }

  async deleteRole(id: string): Promise<boolean> {
    const result = await this.roleRepo.delete(id);
    return (
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0
    );
  }

  async assignPermissionToRole(
    role: Role,
    permission: Permission,
  ): Promise<Role> {
    if (!role.permissions) {
      role.permissions = [];
    }

    if (!role.permissions.some((p) => p.id === permission.id)) {
      role.permissions.push(permission);
      return this.roleRepo.save(role);
    }

    return role;
  }

  async removePermissionFromRole(
    role: Role,
    permissionId: string,
  ): Promise<Role> {
    if (!role.permissions) {
      return role;
    }

    role.permissions = role.permissions.filter(
      (permission) => permission.id !== permissionId,
    );
    return this.roleRepo.save(role);
  }

  async count(): Promise<number> {
    return this.roleRepo.count();
  }
}
