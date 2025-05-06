import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ValidationArguments } from 'class-validator';
import * as hibp from 'hibp';

import {
  PasswordStrengthConstraint,
  IsStrongPassword,
} from './password-strength.validator';

// Mock zxcvbn
jest.mock('zxcvbn', () => {
  return jest.fn().mockImplementation((password, userInputs) => {
    // Simple mock implementation
    const score =
      password.length >= 12 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
        ? 4
        : 2;

    return {
      score,
      feedback: {
        warning: score < 3 ? 'This is a weak password' : '',
        suggestions: ['Add more characters'],
      },
      sequence: [],
      crack_times_seconds: {},
      crack_times_display: {},
    };
  });
});

// Mock hibp
jest.mock('hibp', () => ({
  pwnedPassword: jest.fn(),
}));

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key, defaultValue) => {
    const config = {
      PASSWORD_MIN_LENGTH: 12,
      PASSWORD_MAX_LENGTH: 128,
      PASSWORD_MIN_SCORE: 3,
      PASSWORD_CHECK_HIBP: true,
    };
    return config[key] !== undefined ? config[key] : defaultValue;
  }),
};

describe('PasswordStrengthValidator', () => {
  let validator: PasswordStrengthConstraint;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordStrengthConstraint,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    validator = module.get<PasswordStrengthConstraint>(
      PasswordStrengthConstraint,
    );

    // Reset mock implementations
    jest.spyOn(hibp, 'pwnedPassword').mockResolvedValue(0);
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('validate', () => {
    it('should pass for a strong password', async () => {
      // Strong password: long, mixed case, numbers, symbols, not common
      const password = 'StrongP@ssw0rd123!';
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(true);
    });

    it('should fail for a password that is too short', async () => {
      const password = 'Short1!';
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });

    it('should fail for a password missing uppercase letters', async () => {
      const password = 'nouppercaseletters1!';
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });

    it('should fail for a password missing lowercase letters', async () => {
      const password = 'NOLOWERCASELETTERS1!';
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });

    it('should fail for a password missing numbers', async () => {
      const password = 'NoNumbersHere!@';
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });

    it('should fail for a password missing special characters', async () => {
      const password = 'NoSpecialChars123';
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });

    it('should fail for a password that contains username', async () => {
      const password = 'StrongP@ssw0rd123!';
      const args = {
        object: { username: 'Strong' },
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });

    it('should fail for a password that contains email', async () => {
      const password = 'johnd0eP@ssw0rd123!';
      const args = {
        object: { email: 'john.doe@example.com' },
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });

    it('should fail for a password that is in a data breach', async () => {
      // Mock HIBP to return a breach count
      jest.spyOn(hibp, 'pwnedPassword').mockResolvedValue(123);

      const password = 'StrongP@ssw0rd123!';
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });

    it('should handle HIBP API errors gracefully', async () => {
      // Mock HIBP to throw an error
      jest
        .spyOn(hibp, 'pwnedPassword')
        .mockRejectedValue(new Error('API error'));

      const password = 'StrongP@ssw0rd123!';
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      // Should still validate the password even if HIBP fails
      const result = await validator.validate(password, args);
      expect(result).toBe(true);
    });

    it('should fail for common passwords', async () => {
      // Test a known common password
      const password = 'Password123!'; // Common pattern with capitalization and suffix
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: password,
        targetName: 'TestClass',
      } as ValidationArguments;

      const result = await validator.validate(password, args);
      expect(result).toBe(false);
    });
  });

  describe('analyzePassword', () => {
    it('should provide comprehensive analysis with appropriate feedback', async () => {
      const password = 'password123';
      const dto = {
        email: 'john@example.com',
        username: 'johndoe',
      };

      const analysis = await validator.analyzePassword(password, dto);

      expect(analysis).toHaveProperty('score');
      expect(analysis).toHaveProperty('feedback');
      expect(analysis).toHaveProperty('hasCommonPattern');
      expect(analysis).toHaveProperty('missingRequirements');
      expect(analysis.missingRequirements.length).toBeGreaterThan(0);
    });

    it('should detect leet speak substitutions of personal info', async () => {
      const password = 'j0hnd03P@ss!'; // johndoe with leet speak
      const dto = {
        email: 'john@example.com',
        username: 'johndoe',
      };

      const analysis = await validator.analyzePassword(password, dto);

      // Should detect username in leet speak
      const containsPersonalInfo = validator['checkPersonalInfo'](
        password,
        validator['extractPersonalInfo'](dto),
      );
      expect(containsPersonalInfo).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      // Arrange
      const args = {
        object: {
          __passwordStrength: {
            score: 2,
            feedback: ['Password must be at least 12 characters long'],
            missingRequirements: ['minimum length (12 characters)'],
            suggestions: [],
          },
        },
        property: 'password',
        constraints: [],
        value: 'weak',
        targetName: 'TestClass',
      } as ValidationArguments;

      // Act
      const message = validator.defaultMessage(args);

      // Assert
      expect(message).toBe('Password must be at least 12 characters long');
    });

    it('should return generic message when no feedback available', () => {
      // Arrange
      const args = {
        object: {
          __passwordStrength: {
            score: 2,
            feedback: [],
            missingRequirements: [],
            suggestions: [],
          },
        },
        property: 'password',
        constraints: [],
        value: 'weak',
        targetName: 'TestClass',
      } as ValidationArguments;

      // Act
      const message = validator.defaultMessage(args);

      // Assert
      expect(message).toBe(
        'Password is not strong enough. Please choose a stronger password.',
      );
    });

    it('should handle missing strength object', () => {
      // Arrange
      const args = {
        object: {},
        property: 'password',
        constraints: [],
        value: 'weak',
        targetName: 'TestClass',
      } as ValidationArguments;

      // Act
      const message = validator.defaultMessage(args);

      // Assert
      expect(message).toBe('Password does not meet security requirements');
    });
  });
});
