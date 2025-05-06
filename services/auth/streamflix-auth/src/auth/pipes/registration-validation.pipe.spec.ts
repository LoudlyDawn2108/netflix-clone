import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { RegistrationValidationPipe } from './registration-validation.pipe';
import { EmailUniquePipe } from './email-unique.pipe';
import { User } from '../../database/entities/user.entity';
import { RegisterUserDto } from '../dto/register-user.dto';

// Mock Repository
const mockUserRepository = {
  findOne: jest.fn(),
};

// Mock EmailUniquePipe
const mockEmailUniquePipe = {
  transform: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key, defaultValue) => {
    const configValues = {
      PASSWORD_MIN_LENGTH: 12,
      PASSWORD_MAX_LENGTH: 128,
      PASSWORD_MIN_SCORE: 3,
      PASSWORD_CHECK_HIBP: false, // disable HIBP checks in tests
    };
    return configValues[key] !== undefined ? configValues[key] : defaultValue;
  }),
};

// Need to mock the class-validator custom validators
jest.mock('../dto/validators/password-strength.validator', () => ({
  IsStrongPassword: () => jest.fn(),
  PasswordStrengthConstraint: jest.fn().mockImplementation(() => ({
    validate: jest.fn(() => true),
    defaultMessage: jest.fn(() => 'Password strength error'),
  })),
}));

jest.mock('../dto/validators/password-match.validator', () => ({
  IsPasswordMatch: function () {
    return jest.fn();
  },
  IsPasswordMatchConstraint: jest.fn().mockImplementation(() => ({
    validate: jest.fn((value, args) => value === args.object.passwordConfirm),
    defaultMessage: jest.fn(() => 'Passwords do not match'),
  })),
}));

describe('RegistrationValidationPipe', () => {
  let pipe: RegistrationValidationPipe;
  let userRepository: Repository<User>;
  let emailUniquePipe: EmailUniquePipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationValidationPipe,
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
          useValue: mockConfigService,
        },
      ],
    }).compile();

    pipe = module.get<RegistrationValidationPipe>(RegistrationValidationPipe);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    emailUniquePipe = module.get<EmailUniquePipe>(EmailUniquePipe);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'StrongP@ssw0rd123',
      passwordConfirm: 'StrongP@ssw0rd123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should successfully validate valid registration data', async () => {
      // Arrange
      mockEmailUniquePipe.transform.mockResolvedValue({
        email: 'test@example.com',
      });
      mockUserRepository.findOne.mockResolvedValue(null); // Username doesn't exist

      // Act
      const result = await pipe.transform(validRegistrationData);

      // Assert
      expect(result).toEqual(validRegistrationData);
      expect(emailUniquePipe.transform).toHaveBeenCalledWith({
        email: validRegistrationData.email,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: ILike(validRegistrationData.username) },
      });
    });

    it('should transform email to lowercase', async () => {
      // Arrange
      const mixedCaseEmail = {
        ...validRegistrationData,
        email: 'Test.User@Example.com',
      };

      mockEmailUniquePipe.transform.mockResolvedValue({
        email: 'test.user@example.com',
      });
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await pipe.transform(mixedCaseEmail);

      // Assert
      expect(result.email).toBe('test.user@example.com');
    });

    it('should reject when email is not unique', async () => {
      // Arrange
      const emailError = new BadRequestException('Email already exists');
      mockEmailUniquePipe.transform.mockRejectedValue(emailError);

      // Act & Assert
      await expect(pipe.transform(validRegistrationData)).rejects.toThrow(
        BadRequestException,
      );
      expect(emailUniquePipe.transform).toHaveBeenCalled();
    });

    it('should reject when username already exists', async () => {
      // Arrange
      mockEmailUniquePipe.transform.mockResolvedValue({
        email: validRegistrationData.email,
      });
      mockUserRepository.findOne.mockResolvedValue(new User()); // Username exists

      // Act & Assert
      await expect(pipe.transform(validRegistrationData)).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.findOne).toHaveBeenCalled();
    });

    it('should reject when password and confirmation do not match', async () => {
      // Arrange
      const mismatchedPasswordData = {
        ...validRegistrationData,
        passwordConfirm: 'DifferentP@ssword123',
      };
      mockEmailUniquePipe.transform.mockResolvedValue({
        email: validRegistrationData.email,
      });

      // Act & Assert
      await expect(pipe.transform(mismatchedPasswordData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid email format', async () => {
      // Arrange
      const invalidEmailData = {
        ...validRegistrationData,
        email: 'not-an-email',
      };

      // Act & Assert
      await expect(pipe.transform(invalidEmailData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when username is too short', async () => {
      // Arrange
      const shortUsernameData = {
        ...validRegistrationData,
        username: 'ab', // Less than 3 characters
      };

      // Act & Assert
      await expect(pipe.transform(shortUsernameData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when username contains invalid characters', async () => {
      // Arrange
      const invalidUsernameData = {
        ...validRegistrationData,
        username: 'user@name!', // Contains invalid characters
      };

      // Act & Assert
      await expect(pipe.transform(invalidUsernameData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject missing required fields', async () => {
      // Arrange
      const incompleteData = {
        email: 'test@example.com',
        // Missing username and password fields
      };

      // Act & Assert
      await expect(pipe.transform(incompleteData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected database error');
      mockEmailUniquePipe.transform.mockResolvedValue({
        email: validRegistrationData.email,
      });
      mockUserRepository.findOne.mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(pipe.transform(validRegistrationData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate first and last name lengths', async () => {
      // Arrange
      const longNameData = {
        ...validRegistrationData,
        firstName: 'A'.repeat(51), // Exceeds 50 characters
        lastName: 'B'.repeat(51), // Exceeds 50 characters
      };

      // Act & Assert
      await expect(pipe.transform(longNameData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow empty optional fields', async () => {
      // Arrange
      const noOptionalsData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'StrongP@ssw0rd123',
        passwordConfirm: 'StrongP@ssw0rd123',
        // firstName and lastName are omitted
      };

      mockEmailUniquePipe.transform.mockResolvedValue({
        email: noOptionalsData.email,
      });
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await pipe.transform(noOptionalsData);

      // Assert
      expect(result).toEqual(noOptionalsData);
    });
  });
});
