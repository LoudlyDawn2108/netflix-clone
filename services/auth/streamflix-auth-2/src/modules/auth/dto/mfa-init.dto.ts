import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class MfaInitDto {
  @ApiProperty({
    description: 'Type of MFA to initialize',
    example: 'totp',
    enum: ['totp', 'sms'],
  })
  @IsEnum(['totp', 'sms'])
  @IsNotEmpty()
  mfaType: 'totp' | 'sms';

  @ApiProperty({
    description: 'Phone number for SMS MFA (required only for SMS MFA)',
    example: '+15551234567',
    required: false,
  })
  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;
}
