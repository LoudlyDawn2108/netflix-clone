import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class MfaVerifyDto {
  @ApiProperty({
    description: 'Six-digit verification code from authenticator app or SMS',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
