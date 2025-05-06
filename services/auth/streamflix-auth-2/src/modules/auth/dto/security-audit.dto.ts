import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SecurityAuditFilterDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @IsPositive()
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    description: 'Event types to filter by',
    example: ['login_failed', 'mfa_enabled'],
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  eventTypes?: string[];

  @ApiProperty({
    description: 'Event severities to filter by',
    example: ['info', 'warning'],
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsEnum(['info', 'warning', 'error', 'critical'], { each: true })
  @IsOptional()
  severities?: string[];

  @ApiProperty({
    description: 'Start date for filtering',
    example: '2025-04-01T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiProperty({
    description: 'End date for filtering',
    example: '2025-05-05T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'createdAt',
    required: false,
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    required: false,
    enum: ['ASC', 'DESC'],
  })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class SecurityAuditExportDto {
  @ApiProperty({
    description: 'IP address to filter by',
    example: '192.168.1.1',
    required: false,
  })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({
    description: 'Event types to include',
    example: ['login_success', 'login_failed'],
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  eventTypes?: string[];

  @ApiProperty({
    description: 'Start date for export',
    example: '2025-04-01T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiProperty({
    description: 'End date for export',
    example: '2025-05-05T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiProperty({
    description: 'Only include suspicious activities',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isSuspicious?: boolean;

  @ApiProperty({
    description: 'Minimum risk score',
    example: 50,
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  minRiskScore?: number;
}
