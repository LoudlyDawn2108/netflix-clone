import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleResponseDto,
  AssignPermissionsDto,
} from '../dto/role.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { HasPermission } from '../../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../../common/guards/permission.guard';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all roles',
    type: [RoleResponseDto],
  })
  @Get()
  @HasPermission('view:roles')
  async findAll(): Promise<RoleResponseDto[]> {
    return this.roleService.findAll();
  }

  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the role',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @Get(':id')
  @HasPermission('view:roles')
  async findOne(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.roleService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Role with this name already exists',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @HasPermission('manage:roles')
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.roleService.create(createRoleDto);
  }

  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'System roles cannot be modified',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @Put(':id')
  @HasPermission('manage:roles')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.roleService.update(id, updateRoleDto);
  }

  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'System roles cannot be deleted or role is in use',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @HasPermission('manage:roles')
  async remove(@Param('id') id: string): Promise<void> {
    await this.roleService.remove(id);
  }

  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions assigned successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role or permission not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'System roles cannot be modified',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @Post(':id/permissions')
  @HasPermission('manage:roles')
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<RoleResponseDto> {
    return this.roleService.assignPermissions(id, assignPermissionsDto);
  }

  @ApiOperation({ summary: 'Remove a permission from a role' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission removed successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role or permission not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'System roles cannot be modified',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @Delete(':id/permissions/:permissionId')
  @HasPermission('manage:roles')
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ): Promise<RoleResponseDto> {
    return this.roleService.removePermission(id, permissionId);
  }
}
