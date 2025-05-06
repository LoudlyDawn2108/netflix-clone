import { ApiProperty } from '@nestjs/swagger';

/**
 * Base error response schema for all API errors
 * Used for Swagger documentation
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: 'BAD_REQUEST',
    description: 'Error code for programmatic identification',
  })
  errorCode: string;

  @ApiProperty({
    example: 'Invalid input data',
    description: 'Human-readable error message',
  })
  message: string;

  @ApiProperty({
    example: '2025-05-03T10:15:30.123Z',
    description: 'Timestamp when the error occurred',
  })
  timestamp: string;

  @ApiProperty({
    example: '/api/auth/signup',
    description: 'API path that generated the error',
  })
  path: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for this request/error for tracing',
  })
  requestId: string;
}

/**
 * Validation error response schema
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ example: 'VALIDATION_FAILED' })
  errorCode: string;

  @ApiProperty({
    example: [
      'email must be a valid email',
      'password must be at least 8 characters',
    ],
    description: 'Detailed validation error messages',
    required: false,
  })
  details?: string[];

  @ApiProperty({
    example: {
      email: ['must be a valid email'],
      password: ['must be at least 8 characters'],
    },
    description: 'Structured validation errors by field',
    required: false,
  })
  validationErrors?: Record<string, string[]>;
}

/**
 * Duplicate entity error response schema
 */
export class DuplicateEntityErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ example: 'USER_EMAIL_EXISTS' })
  errorCode: string;

  @ApiProperty({
    example: 'email',
    description: 'The field causing the conflict',
    required: false,
  })
  field?: string;
}

/**
 * Password validation error response schema
 */
export class PasswordErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ example: 'PASSWORD_TOO_WEAK' })
  errorCode: string;

  @ApiProperty({
    example: 'password',
    description: 'Field name that has the error',
  })
  field: string;

  @ApiProperty({
    example: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecial: true,
    },
    description: 'Password policy requirements',
  })
  passwordRequirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigit: boolean;
    requireSpecial: boolean;
  };
}

/**
 * Rate limiting error response schema
 */
export class RateLimitErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ example: 'RATE_LIMIT_EXCEEDED' })
  errorCode: string;

  @ApiProperty({
    example: 60,
    description: 'Seconds to wait before retrying',
  })
  retryAfter: number;
}

/**
 * Unprocessable entity error response schema
 */
export class UnprocessableEntityErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ example: 'UNPROCESSABLE_ENTITY' })
  errorCode: string;

  @ApiProperty({
    example: 'birthdate',
    description: 'Field with semantic error',
    required: false,
  })
  field?: string;
}
