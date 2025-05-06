import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MfaValidateDto {
  @ApiProperty({
    description: 'User ID requiring MFA validation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description:
      'Six-digit verification code from authenticator app, SMS, or backup code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
