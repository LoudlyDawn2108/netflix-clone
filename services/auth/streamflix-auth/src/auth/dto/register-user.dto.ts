import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsPasswordMatch } from './validators/password-match.validator';
import { IsStrongPassword } from './validators/password-strength.validator';

/**
 * DTO for user registration input
 */
export class RegisterUserDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Unique username for the account',
    example: 'johndoe',
  })
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @ApiProperty({
    description:
      'Password for the account (12+ chars with upper, lower, number, symbol)',
    example: 'StrongP@ssw0rd123',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword({
    message: 'Password does not meet security requirements',
  })
  password: string;

  @ApiProperty({
    description: 'Confirm password (must match password)',
    example: 'StrongP@ssw0rd123',
  })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @IsPasswordMatch('password', {
    message: 'Passwords do not match',
  })
  passwordConfirm: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    required: false,
  })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    required: false,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName?: string;
}
