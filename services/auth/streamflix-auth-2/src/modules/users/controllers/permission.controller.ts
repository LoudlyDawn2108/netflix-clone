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
import { PermissionService } from '../services/permission.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from '../dto/permission.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { HasPermission } from '../../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../../common/guards/permission.guard';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all permissions',
    type: [PermissionResponseDto],
  })
  @Get()
  @HasPermission('view:roles')
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionService.findAll();
  }

  @ApiOperation({ summary: 'Get a permission by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the permission',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @Get(':id')
  @HasPermission('view:roles')
  async findOne(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission created successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Permission with this name already exists',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @HasPermission('manage:roles')
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.create(createPermissionDto);
  }

  @ApiOperation({ summary: 'Update a permission' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission updated successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'System permissions cannot be modified',
  })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @Put(':id')
  @HasPermission('manage:roles')
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionService.update(id, updatePermissionDto);
  }

  @ApiOperation({ summary: 'Delete a permission' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permission deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'System permissions cannot be deleted',
  })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @HasPermission('manage:roles')
  async remove(@Param('id') id: string): Promise<void> {
    await this.permissionService.remove(id);
  }

  @ApiOperation({ summary: 'Find permissions by resource' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns permissions for the specified resource',
    type: [PermissionResponseDto],
  })
  @ApiParam({ name: 'resource', description: 'Resource name' })
  @Get('resource/:resource')
  @HasPermission('view:roles')
  async findByResource(
    @Param('resource') resource: string,
  ): Promise<PermissionResponseDto[]> {
    return this.permissionService.findByResource(resource);
  }
}
