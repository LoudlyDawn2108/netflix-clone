import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission name', example: 'create:users' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Permission description',
    example: 'Allows creating users',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Resource this permission relates to',
    example: 'users',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Action permitted on resource',
    example: 'create',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Optional scope limitation',
    example: 'own',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Is this a system permission',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({
    description: 'Permission description',
    example: 'Allows creating users',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Resource this permission relates to',
    example: 'users',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Action permitted on resource',
    example: 'create',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Optional scope limitation',
    example: 'own',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Is this a system permission',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

export class PermissionResponseDto {
  @ApiProperty({
    description: 'Permission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Permission name', example: 'create:users' })
  name: string;

  @ApiProperty({
    description: 'Permission description',
    example: 'Allows creating users',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Resource this permission relates to',
    example: 'users',
  })
  resource?: string;

  @ApiPropertyOptional({
    description: 'Action permitted on resource',
    example: 'create',
  })
  action?: string;

  @ApiPropertyOptional({
    description: 'Optional scope limitation',
    example: 'own',
  })
  scope?: string;

  @ApiProperty({ description: 'Is this a system permission', example: false })
  isSystem: boolean;

  @ApiProperty({ description: 'Permission creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Permission last update timestamp' })
  updatedAt: Date;
}
