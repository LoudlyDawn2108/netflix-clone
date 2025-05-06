import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  HttpExceptionFilter,
  ValidationExceptionFilter,
  DuplicateEntityExceptionFilter,
  PasswordStrengthExceptionFilter,
  UnprocessableEntityExceptionFilter,
  RateLimitExceptionFilter,
} from './index';
import { QueryFailedError } from 'typeorm';
import { ThrottlerException } from '@nestjs/throttler';

describe('Exception Filters', () => {
  // Test setup helpers
  const mockResponse = (): any => {
    const res: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
    };
    return res;
  };

  const mockRequest = (): any => {
    const req: Partial<Request> = {
      url: '/api/auth/signup',
      method: 'POST',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      ip: '127.0.0.1',
      user: { id: 'test-user-id' },
      ttl: 30000, // 30 seconds
    };
    return req;
  };

  const mockArgumentsHost = (
    req = mockRequest(),
    res = mockResponse(),
  ): ArgumentsHost => {
    const argumentsHost = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
    return argumentsHost as ArgumentsHost;
  };

  // Tests for HttpExceptionFilter
  describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;

    beforeEach(() => {
      filter = new HttpExceptionFilter();
    });

    it('should format HTTP exception responses correctly', () => {
      // Arrange
      const exception = new HttpException(
        'Test error message',
        HttpStatus.BAD_REQUEST,
      );
      const host = mockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      // Act
      filter.catch(exception, host);

      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'BAD_REQUEST',
          message: 'Test error message',
          timestamp: expect.any(String),
          path: '/api/auth/signup',
          requestId: expect.any(String),
        }),
      );
    });
  });

  // Tests for ValidationExceptionFilter
  describe('ValidationExceptionFilter', () => {
    let filter: ValidationExceptionFilter;

    beforeEach(() => {
      filter = new ValidationExceptionFilter();
    });

    it('should handle validation error messages correctly', () => {
      // Arrange
      const exception = new BadRequestException({
        message: ['email must be valid', 'password is too weak'],
      });
      const host = mockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      // Act
      filter.catch(exception, host);

      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'VALIDATION_FAILED',
          message: 'Validation failed. Please check your input.',
          details: ['email must be valid', 'password is too weak'],
        }),
      );
    });
  });

  // Tests for DuplicateEntityExceptionFilter
  describe('DuplicateEntityExceptionFilter', () => {
    let filter: DuplicateEntityExceptionFilter;

    beforeEach(() => {
      filter = new DuplicateEntityExceptionFilter();
    });

    it('should handle ConflictException correctly', () => {
      // Arrange
      const exception = new ConflictException('Email already exists');
      const host = mockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      // Act
      filter.catch(exception, host);

      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'USER_EMAIL_EXISTS',
          message: 'Email already exists',
          field: 'email',
        }),
      );
    });

    it('should handle PostgreSQL unique violation errors', () => {
      // Arrange
      const queryError = Object.assign(
        new Error(
          'duplicate key value violates unique constraint "UQ_USER_EMAIL"',
        ),
        {
          name: 'QueryFailedError',
          length: 0,
          severity: 'ERROR',
          code: '23505',
          detail: 'Key (email)=(test@example.com) already exists.',
          constraint: 'UQ_USER_EMAIL',
          table: 'users',
          column: undefined,
        },
      ) as QueryFailedError;

      const host = mockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      // Act
      filter.catch(queryError, host);

      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'USER_EMAIL_EXISTS',
          field: 'email',
        }),
      );
    });
  });

  // Tests for PasswordStrengthExceptionFilter
  describe('PasswordStrengthExceptionFilter', () => {
    let filter: PasswordStrengthExceptionFilter;

    beforeEach(() => {
      filter = new PasswordStrengthExceptionFilter();
    });

    it('should handle password error messages correctly', () => {
      // Arrange
      const exception = new BadRequestException(
        'Password must contain at least one uppercase letter',
      );
      const host = mockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      // Act
      filter.catch(exception, host);

      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'PASSWORD_REQUIRES_UPPERCASE',
          message: 'Password must contain at least one uppercase letter.',
        }),
      );
    });

    it('should pass through non-password errors', () => {
      // Arrange
      const exception = new BadRequestException('Username is required');
      const host = mockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      // Act
      const result = filter.catch(exception, host);

      // Assert
      expect(result).toBeUndefined();
      expect(response.json).not.toHaveBeenCalled();
    });
  });

  // Tests for UnprocessableEntityExceptionFilter
  describe('UnprocessableEntityExceptionFilter', () => {
    let filter: UnprocessableEntityExceptionFilter;

    beforeEach(() => {
      filter = new UnprocessableEntityExceptionFilter();
    });

    it('should handle unprocessable entity exceptions correctly', () => {
      // Arrange
      const exception = new UnprocessableEntityException({
        message: 'Invalid date format',
        field: 'birthdate',
      });
      const host = mockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      // Act
      filter.catch(exception, host);

      // Assert
      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          errorCode: 'UNPROCESSABLE_ENTITY',
          message: 'Invalid date format',
          field: 'birthdate',
        }),
      );
    });
  });

  // Tests for RateLimitExceptionFilter
  describe('RateLimitExceptionFilter', () => {
    let filter: RateLimitExceptionFilter;

    beforeEach(() => {
      filter = new RateLimitExceptionFilter();
    });

    it('should handle rate limit exceptions correctly', () => {
      // Arrange
      const exception = new ThrottlerException('Rate limit exceeded');
      const req = mockRequest();
      const res = mockResponse();
      const host = mockArgumentsHost(req, res);

      // Act
      filter.catch(exception, host);

      // Assert
      expect(res.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          errorCode: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: 30, // 30 seconds (from ttl)
        }),
      );
      expect(res.header).toHaveBeenCalledWith('Retry-After', '30');
    });

    it('should provide default retry time when ttl is not available', () => {
      // Arrange
      const exception = new ThrottlerException('Rate limit exceeded');
      const req = { ...mockRequest(), ttl: undefined };
      const res = mockResponse();
      const host = mockArgumentsHost(req, res);

      // Act
      filter.catch(exception, host);

      // Assert
      expect(res.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60, // Default 60 seconds
        }),
      );
      expect(res.header).toHaveBeenCalledWith('Retry-After', '60');
    });
  });
});
