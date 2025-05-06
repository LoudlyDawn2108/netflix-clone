import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  mfaEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  failedLoginAttempts?: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lockUntil?: Date | null;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lastLogin?: Date;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  providerId?: string;
}
