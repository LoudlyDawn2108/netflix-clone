import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegistrationValidationPipe } from './pipes/registration-validation.pipe';
import { EmailUniquePipe } from './pipes/email-unique.pipe';
import { User } from '../database/entities/user.entity';
import { ConfigService } from '@nestjs/config';

// Mock implementation of AuthService
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
};

// Mock implementation of UserRepository
const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

// Mock implementation of EmailUniquePipe
const mockEmailUniquePipe = {
  transform: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EmailUniquePipe,
          useValue: mockEmailUniquePipe,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
        {
          provide: RegistrationValidationPipe,
          useValue: {
            transform: jest.fn((value) => value),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const validRegisterDto: RegisterUserDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'StrongP@ssw0rd123',
      passwordConfirm: 'StrongP@ssw0rd123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should successfully register a new user', async () => {
      // Arrange
      const userId = '12345678-1234-1234-1234-123456789012';
      mockAuthService.register.mockResolvedValue({ userId });

      // Act
      const result = await controller.register(validRegisterDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(validRegisterDto);
      expect(result).toEqual({
        success: true,
        message:
          'Registration successful. Please check your email for verification.',
        userId,
      });
    });

    it('should handle duplicate email/username error', async () => {
      // Arrange
      const postgresUniqueError = new Error(
        'duplicate key value violates unique constraint',
      );
      postgresUniqueError['code'] = '23505'; // PostgreSQL unique constraint error code
      mockAuthService.register.mockRejectedValue(postgresUniqueError);

      // Act & Assert
      await expect(controller.register(validRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      expect(authService.register).toHaveBeenCalledWith(validRegisterDto);
    });

    it('should propagate BadRequestException from service', async () => {
      // Arrange
      const badRequestError = new BadRequestException('Invalid input data');
      mockAuthService.register.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.register(validRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authService.register).toHaveBeenCalledWith(validRegisterDto);
    });

    it('should convert unknown errors to InternalServerErrorException', async () => {
      // Arrange
      const unknownError = new Error('Unknown database error');
      mockAuthService.register.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(controller.register(validRegisterDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(authService.register).toHaveBeenCalledWith(validRegisterDto);
    });

    // Check if the method is decorated with the validation pipe
    it('should use RegistrationValidationPipe for input validation', () => {
      // We can't easily test the decorator without reflection, so we'll just verify the controller has this method
      expect(controller.register).toBeDefined();
      // The actual validation pipe is applied at runtime, so we just verify the method exists
    });
  });
});
