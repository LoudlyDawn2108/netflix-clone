import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class IpWhitelistDto {
  @ApiProperty({
    description: 'IP address to add to whitelist',
    example: '192.168.1.1',
  })
  @IsIP()
  @IsNotEmpty()
  ipAddress: string;
}

export class IpBlacklistDto {
  @ApiProperty({
    description: 'IP address to add to blacklist',
    example: '10.0.0.1',
  })
  @IsIP()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({
    description: 'Reason for blacklisting this IP address',
    example: 'Suspicious login attempts',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}

export class GlobalIpBlacklistDto extends IpBlacklistDto {
  @ApiProperty({
    description: 'Optional expiration date for the blacklist entry',
    example: '2023-12-31T23:59:59.999Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
