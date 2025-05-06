import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  UsePipes,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  UseFilters,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegistrationValidationPipe } from './pipes/registration-validation.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  ValidationExceptionFilter,
  DuplicateEntityExceptionFilter,
  PasswordStrengthExceptionFilter,
  UnprocessableEntityExceptionFilter,
  RateLimitExceptionFilter,
  HttpExceptionFilter,
} from '../common/filters';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
  DuplicateEntityErrorResponseDto,
  PasswordErrorResponseDto,
  RateLimitErrorResponseDto,
  UnprocessableEntityErrorResponseDto,
} from '../common/dto/error-responses.dto';

// We'll define the DTO interfaces for now
// Later we'll create proper classes with validation
interface LoginDto {
  email: string;
  password: string;
}

interface RefreshTokenDto {
  refreshToken: string;
}

interface LogoutDto {
  refreshToken: string;
}

@ApiTags('Authentication')
@Controller('auth')
@UseFilters(HttpExceptionFilter, RateLimitExceptionFilter) // Apply the global exception filters as fallback
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Registration endpoint - creates a new user account
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'Registration successful. Please check your email for verification.',
        },
        userId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Password validation failed',
    type: PasswordErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or username already exists',
    type: DuplicateEntityErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Invalid data format',
    type: UnprocessableEntityErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many registration attempts, please try again later',
    type: RateLimitErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @UseFilters(
    ValidationExceptionFilter,
    DuplicateEntityExceptionFilter,
    PasswordStrengthExceptionFilter,
    UnprocessableEntityExceptionFilter,
  ) // Apply specialized filters in order of precedence
  @UsePipes(RegistrationValidationPipe)
  async register(@Body() registerUserDto: RegisterUserDto) {
    try {
      this.logger.debug(`Registration attempt for ${registerUserDto.email}`);

      // Call auth service to handle user creation
      const result = await this.authService.register(registerUserDto);

      return {
        success: true,
        message:
          'Registration successful. Please check your email for verification.',
        userId: result.userId,
      };
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);

      if (error.code === '23505') {
        // PostgreSQL unique constraint violation
        throw new ConflictException('Email or username already exists');
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new InternalServerErrorException(
          'Registration failed. Please try again later.',
        );
      }
    }
  }

  /**
   * Login endpoint - for now just a placeholder that returns tokens
   * Will be expanded with actual authentication in future tasks
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and receive tokens' })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'Password123!' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    schema: {
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        userId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          example: ['user'],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid credentials',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many login attempts, please try again later',
    type: RateLimitErrorResponseDto,
  })
  @UseFilters(RateLimitExceptionFilter)
  async login(@Body() loginDto: LoginDto) {
    // This is a placeholder implementation
    // In the actual implementation, we'll validate credentials against the database
    this.logger.debug(`Login attempt for ${loginDto.email}`);

    // Mock successful login with userId and roles
    // In the real implementation, this data would come from the database
    const userId = '12345678-1234-1234-1234-123456789012';
    const roles = ['user'];

    const tokenData = await this.authService.login(userId, roles, {
      email: loginDto.email,
      lastLogin: new Date().toISOString(),
    });

    return {
      ...tokenData,
      userId,
      roles,
    };
  }

  /**
   * Token refresh endpoint
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh an expired access token' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refresh successful',
    schema: {
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const { refreshToken } = refreshTokenDto;
      this.logger.debug('Processing token refresh request');

      const result = await this.authService.refreshToken(refreshToken);

      return result;
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout endpoint to revoke refresh token
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  async logout(@Body() logoutDto: LogoutDto) {
    try {
      const { refreshToken } = logoutDto;
      this.logger.debug('Processing logout request');

      const result = await this.authService.logout(refreshToken);

      return { success: result };
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`);
      return { success: false };
    }
  }
}
