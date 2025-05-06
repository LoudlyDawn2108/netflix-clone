import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
} from 'class-validator';
import { PermissionResponseDto } from './permission.dto';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'content-editor' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Can create and edit content items',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Parent role ID for inheritance',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Is this a system role that should not be modified',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: 'List of permission IDs to assign to this role',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Can create and edit content items',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent role ID for inheritance',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Is this a system role that should not be modified',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'List of permission IDs to assign to this role',
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID(4, { each: true })
  permissionIds: string[];
}

export class RoleResponseDto {
  @ApiProperty({
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Role name', example: 'content-editor' })
  name: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Can create and edit content items',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Parent role ID if hierarchical',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  parentId?: string;

  @ApiProperty({ description: 'Is this a system role', example: false })
  isSystem: boolean;

  @ApiProperty({ description: 'Role creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Role last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Permissions assigned to this role',
    type: [PermissionResponseDto],
  })
  permissions?: PermissionResponseDto[];
}

export class AssignRolesToUserDto {
  @ApiProperty({
    description: 'List of role IDs to assign to a user',
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID(4, { each: true })
  roleIds: string[];
}
