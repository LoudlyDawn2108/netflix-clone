import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class DeviceRegistrationDto {
  @ApiProperty({
    description: 'Device name (auto-populated, can be changed by user)',
    example: 'Chrome on Windows 10',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Browser information',
    example: 'Chrome 118.0.0',
  })
  @IsString()
  @IsOptional()
  browserInfo?: string;

  @ApiProperty({
    description: 'Operating system information',
    example: 'Windows 10',
  })
  @IsString()
  @IsOptional()
  operatingSystem?: string;

  @ApiProperty({
    description: 'Device type',
    example: 'desktop',
    enum: ['mobile', 'tablet', 'desktop', 'other'],
  })
  @IsEnum(['mobile', 'tablet', 'desktop', 'other'])
  @IsNotEmpty()
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'other';

  @ApiProperty({
    description: 'Location data (city, country, etc)',
    example: { city: 'New York', country: 'US' },
  })
  @IsObject()
  @IsOptional()
  location?: Record<string, any>;
}

export class DeviceUpdateDto {
  @ApiProperty({
    description: 'Custom name for the device',
    example: 'My Work Laptop',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Trust level for the device',
    example: 'high',
    enum: ['low', 'medium', 'high'],
    required: false,
  })
  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  trustLevel?: 'low' | 'medium' | 'high';
}

export class DeviceVerificationDto {
  @ApiProperty({
    description: 'Token received via email to verify a new device',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
