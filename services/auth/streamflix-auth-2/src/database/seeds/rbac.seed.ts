import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { RoleService } from '../../modules/users/services/role.service';
import { PermissionService } from '../../modules/users/services/permission.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class RBACSeeder {
  private readonly logger = new Logger(RBACSeeder.name);

  constructor(
    @InjectConnection() private connection: Connection,
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
  ) {}

  async seed(): Promise<void> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('Creating system permissions...');
      await this.permissionService.createSystemPermissions();

      this.logger.log('Creating system roles...');
      await this.roleService.createSystemRoles();

      await queryRunner.commitTransaction();
      this.logger.log('RBAC seeding completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error seeding RBAC data: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
