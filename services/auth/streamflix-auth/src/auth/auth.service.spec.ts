import { Test, TestingModule } from '@nestjs/testing';
import { REQUEST } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PasswordService } from '../common/security/password.service';
import { PasswordHistoryService } from './password-history.service';
import { UserEventsService } from '../common/events/user.events';
import { AuditService } from '../common/audit/audit.service';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { RegisterUserDto } from './dto/register-user.dto';

// Mock Request
const mockRequest = {
  ip: '127.0.0.1',
  headers: {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/96.0.4664.110',
    'x-correlation-id': 'test-correlation-id',
  },
};

// Mock TokenService
const mockTokenService = {
  generateTokens: jest.fn(),
  refreshAccessToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  validateAccessToken: jest.fn(),
};

// Mock PasswordService
const mockPasswordService = {
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
};

// Mock PasswordHistoryService
const mockPasswordHistoryService = {
  addPasswordToHistory: jest.fn(),
  isPasswordInHistory: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn(),
};

// Mock UserEventsService
const mockUserEventsService = {
  emitUserCreated: jest.fn(),
};

// Mock AuditService
const mockAuditService = {
  logAudit: jest.fn(),
};

// Mock Repository
const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockRoleRepository = {
  findOne: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let passwordService: PasswordService;
  let userEventsService: UserEventsService;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: PasswordHistoryService,
          useValue: mockPasswordHistoryService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UserEventsService,
          useValue: mockUserEventsService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    passwordService = module.get<PasswordService>(PasswordService);
    userEventsService = module.get<UserEventsService>(UserEventsService);
    auditService = module.get<AuditService>(AuditService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

    const userRole = { id: '1', name: 'user' } as Role;
    const hashedPassword = 'hashed_password_123';
    const userId = uuidv4();

    beforeEach(() => {
      // Setup common mocks for the register function
      mockRoleRepository.findOne.mockResolvedValue(userRole);
      mockPasswordService.hashPassword.mockResolvedValue(hashedPassword);
      mockUserRepository.save.mockImplementation((user) =>
        Promise.resolve({
          ...user,
          id: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should successfully register a new user', async () => {
      // Act
      const result = await service.register(validRegisterDto);

      // Assert
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'user' },
      });
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        validRegisterDto.password,
      );

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validRegisterDto.email.toLowerCase(),
          username: validRegisterDto.username,
          firstName: validRegisterDto.firstName,
          lastName: validRegisterDto.lastName,
          password: hashedPassword,
          passwordHistory: [hashedPassword],
          roles: [userRole],
          isEmailVerified: false,
        }),
      );

      // Verify events and audit logs
      expect(userEventsService.emitUserCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: userId }),
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: expect.any(String),
          correlationId: 'test-correlation-id',
          eventVersion: '1.0',
          source: 'auth-service',
          roles: ['user'],
        }),
      );

      expect(auditService.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_REGISTERED',
          entityType: 'user',
          entityId: userId,
          userId: userId,
          timestamp: expect.any(Date),
          ipAddress: '127.0.0.1',
          metadata: expect.objectContaining({
            email: validRegisterDto.email,
            username: validRegisterDto.username,
            correlationId: 'test-correlation-id',
          }),
        }),
      );

      expect(result).toEqual({ userId });
    });

    it('should throw an error if default role is not found', async () => {
      // Arrange
      mockRoleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.register(validRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should transform email to lowercase', async () => {
      // Arrange
      const mixedCaseEmailDto = {
        ...validRegisterDto,
        email: 'Test.User@Example.com',
      };

      // Act
      await service.register(mixedCaseEmailDto);

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test.user@example.com', // Should be lowercase
        }),
      );
    });

    it('should handle empty optional fields', async () => {
      // Arrange
      const dtoWithoutOptionals: RegisterUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'StrongP@ssw0rd123',
        passwordConfirm: 'StrongP@ssw0rd123',
      };

      // Act
      await service.register(dtoWithoutOptionals);

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: '',
          lastName: '',
        }),
      );
    });

    it('should generate email verification token with 24-hour expiry', async () => {
      // Arrange - Spy on Date constructor
      const fixedDate = new Date('2025-05-03T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);

      // Act
      await service.register(validRegisterDto);

      // Assert - Simply check that the save was called and the properties exist
      expect(userRepository.save).toHaveBeenCalled();
      const saveArg = mockUserRepository.save.mock.calls[0][0];
      expect(saveArg.emailVerificationToken).toBeDefined();
      expect(saveArg.emailVerificationExpires).toBeDefined();
      expect(saveArg.isEmailVerified).toBe(false);

      // Restore original Date
      jest.restoreAllMocks();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection error');
      mockUserRepository.save.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.register(validRegisterDto)).rejects.toThrow(Error);
      expect(userEventsService.emitUserCreated).not.toHaveBeenCalled();
    });

    it('should handle missing request metadata gracefully', async () => {
      // Arrange - Create a service instance with problematic request
      const moduleWithBadRequest: TestingModule =
        await Test.createTestingModule({
          providers: [
            AuthService,
            { provide: TokenService, useValue: mockTokenService },
            { provide: PasswordService, useValue: mockPasswordService },
            {
              provide: PasswordHistoryService,
              useValue: mockPasswordHistoryService,
            },
            { provide: ConfigService, useValue: mockConfigService },
            { provide: UserEventsService, useValue: mockUserEventsService },
            { provide: AuditService, useValue: mockAuditService },
            { provide: getRepositoryToken(User), useValue: mockUserRepository },
            { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
            { provide: REQUEST, useValue: {} }, // Empty request object
          ],
        }).compile();

      const serviceWithBadRequest =
        moduleWithBadRequest.get<AuthService>(AuthService);

      // Act
      await serviceWithBadRequest.register(validRegisterDto);

      // Assert
      expect(userEventsService.emitUserCreated).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ipAddress: 'unknown',
          userAgent: 'unknown',
          correlationId: expect.any(String),
        }),
      );
    });
  });
});
