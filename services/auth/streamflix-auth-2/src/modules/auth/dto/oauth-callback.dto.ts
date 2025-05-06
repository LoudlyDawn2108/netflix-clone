import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'OAuth provider code',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'OAuth state for CSRF protection',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'Error from OAuth provider',
    required: false,
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: 'Error description from OAuth provider',
    required: false,
  })
  @IsOptional()
  @IsString()
  error_description?: string;
}
