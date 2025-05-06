import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, In, ILike } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';
import { UserEventsService } from '../../common/events/user.events';

export interface CreateUserOptions {
  transactionRunner?: QueryRunner;
  ipAddress?: string;
  userAgent?: string;
  skipAudit?: boolean;
  skipEvents?: boolean;
}

/**
 * Repository for User entity operations with enhanced error handling,
 * transaction support, audit logging, and event emission
 */
@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly userEvents: UserEventsService,
  ) {}

  /**
   * Find a user by ID
   * @param id User ID
   * @returns User entity or null if not found
   */
  async findById(id: string): Promise<User | null> {
    try {
      return this.userRepo.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Error finding user by id (${id}): ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error retrieving user');
    }
  }

  /**
   * Find a user by email - case insensitive
   * @param email User's email address
   * @returns User entity or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return this.userRepo.findOne({
        where: { email: ILike(email.toLowerCase()) },
      });
    } catch (error) {
      this.logger.error(
        `Error finding user by email: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error retrieving user');
    }
  }

  /**
   * Check if a user exists with the given email
   * @param email Email to check
   * @returns Boolean indicating if user with email exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    try {
      const count = await this.userRepo.count({
        where: { email: ILike(email.toLowerCase()) },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if user exists by email: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error checking user existence');
    }
  }

  /**
   * Check if a user exists with the given username
   * @param username Username to check
   * @returns Boolean indicating if user with username exists
   */
  async existsByUsername(username: string): Promise<boolean> {
    try {
      const count = await this.userRepo.count({
        where: { username: ILike(username) },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if user exists by username: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error checking user existence');
    }
  }

  /**
   * Create a new user with comprehensive error handling and transaction support
   * @param userData User data to create
   * @param options Options for creating the user
   * @returns The created user entity
   */
  async createUser(
    userData: Partial<User>,
    options: CreateUserOptions = {},
  ): Promise<User> {
    const {
      transactionRunner,
      ipAddress,
      userAgent,
      skipAudit = false,
      skipEvents = false,
    } = options;

    let queryRunner: QueryRunner | null = null;
    let ownTransaction = false;

    try {
      // Validate required fields
      if (!userData.email) {
        throw new BadRequestException('Email is required');
      }
      if (!userData.username) {
        throw new BadRequestException('Username is required');
      }

      // Normalize email and username
      userData.email = userData.email.toLowerCase().trim();

      // Check for existing users outside transaction to fail fast
      const [emailExists, usernameExists] = await Promise.all([
        this.existsByEmail(userData.email),
        userData.username ? this.existsByUsername(userData.username) : false,
      ]);

      if (emailExists) {
        // Log failed attempt without exposing that the email exists
        if (!skipAudit) {
          this.auditService.logUserCreationFailed(
            userData.email,
            'Email already exists',
            { username: userData.username },
            ipAddress,
          );
        }
        throw new ConflictException('A user with this email already exists');
      }

      if (usernameExists) {
        // Log failed attempt
        if (!skipAudit) {
          this.auditService.logUserCreationFailed(
            userData.email,
            'Username already exists',
            { username: userData.username },
            ipAddress,
          );
        }
        throw new ConflictException('A user with this username already exists');
      }

      // Setup transaction if not provided
      if (!transactionRunner) {
        queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        ownTransaction = true;
      } else {
        queryRunner = transactionRunner;
      }

      // Create and save user within transaction
      const user = this.userRepo.create(userData);

      // Set event emitter on entity for lifecycle hooks
      user.setEventEmitter(this.eventEmitter);

      const savedUser = await queryRunner.manager.save(user);

      // If we're managing our own transaction, commit it
      if (ownTransaction && queryRunner) {
        await queryRunner.commitTransaction();
      }

      // Audit logging (outside transaction)
      if (!skipAudit) {
        this.auditService.logUserCreation(
          savedUser.id,
          savedUser.email,
          {
            username: savedUser.username,
            hasPassword: !!savedUser.password,
            emailVerified: savedUser.isEmailVerified,
          },
          ipAddress,
          userAgent,
        );
      }

      // Emit user created event if not done by entity hooks
      if (!skipEvents) {
        this.userEvents.emitUserCreated(savedUser);
      }

      this.logger.log(`User created successfully with ID: ${savedUser.id}`);
      return savedUser;
    } catch (error) {
      // Roll back transaction if we own it and an error occurred
      if (ownTransaction && queryRunner && queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      // Specific error handling
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error; // Re-throw validation errors
      }

      if (error.code === '23505') {
        // PostgreSQL unique constraint violation
        let errorMessage = 'A user with this information already exists';

        // More specific error messages based on the constraint
        if (error.detail?.includes('email')) {
          errorMessage = 'A user with this email already exists';
        } else if (error.detail?.includes('username')) {
          errorMessage = 'A user with this username already exists';
        }

        // Log the conflict
        if (!skipAudit) {
          this.auditService.logUserCreationFailed(
            userData.email || 'unknown',
            'Database conflict: ' + error.detail,
            { username: userData.username },
            ipAddress,
          );
        }

        this.logger.warn(`User creation failed - conflict: ${error.detail}`);
        throw new ConflictException(errorMessage);
      }

      // Log the error
      this.logger.error(`Error creating user: ${error.message}`, error.stack);

      if (!skipAudit) {
        this.auditService.logUserCreationFailed(
          userData.email || 'unknown',
          'Server error: ' + error.message,
          { username: userData.username },
          ipAddress,
        );
      }

      throw new InternalServerErrorException('Failed to create user');
    } finally {
      // Release resources if we own the transaction
      if (ownTransaction && queryRunner) {
        await queryRunner.release();
      }
    }
  }

  /**
   * Update a user with transaction support
   * @param id User ID
   * @param userData User data to update
   * @param transactionRunner Optional transaction QueryRunner
   * @returns Updated user entity
   */
  async updateUser(
    id: string,
    userData: Partial<User>,
    transactionRunner?: QueryRunner,
  ): Promise<User | null> {
    let queryRunner: QueryRunner | null = null;
    let ownTransaction = false;

    try {
      // Setup transaction if not provided
      if (!transactionRunner) {
        queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        ownTransaction = true;
      } else {
        queryRunner = transactionRunner;
      }

      // Fetch user first to verify existence and for event emission
      const user = await queryRunner.manager.findOne(User, { where: { id } });

      if (!user) {
        throw new BadRequestException(`User with id ${id} not found`);
      }

      // Update entity
      const updateResult = await queryRunner.manager.update(User, id, userData);

      if (updateResult.affected === 0) {
        throw new InternalServerErrorException('Failed to update user');
      }

      // Get updated entity
      const updatedUser = await queryRunner.manager.findOne(User, {
        where: { id },
      });

      // If we're managing our own transaction, commit it
      if (ownTransaction && queryRunner) {
        await queryRunner.commitTransaction();
      }

      // Emit update event
      this.userEvents.emitUserUpdated(updatedUser!, userData);

      return updatedUser;
    } catch (error) {
      // Roll back transaction if we own it and an error occurred
      if (ownTransaction && queryRunner && queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      if (error instanceof BadRequestException) {
        throw error; // Re-throw validation errors
      }

      this.logger.error(
        `Error updating user ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update user');
    } finally {
      // Release resources if we own the transaction
      if (ownTransaction && queryRunner) {
        await queryRunner.release();
      }
    }
  }

  /**
   * Assign a role to a user with transaction support
   * @param user User entity
   * @param role Role to assign
   * @param transactionRunner Optional transaction QueryRunner
   * @returns Updated user entity
   */
  async assignRoleToUser(
    user: User,
    role: Role,
    transactionRunner?: QueryRunner,
  ): Promise<User> {
    let queryRunner: QueryRunner | null = null;
    let ownTransaction = false;

    try {
      // Setup transaction if not provided
      if (!transactionRunner) {
        queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        ownTransaction = true;
      } else {
        queryRunner = transactionRunner;
      }

      // Initialize roles array if needed
      if (!user.roles) {
        user.roles = [];
      }

      // Check if role is already assigned
      if (!user.roles.some((r) => r.id === role.id)) {
        user.roles.push(role);
        await queryRunner.manager.save(user);
      }

      // If we're managing our own transaction, commit it
      if (ownTransaction && queryRunner) {
        await queryRunner.commitTransaction();
      }

      return user;
    } catch (error) {
      // Roll back transaction if we own it and an error occurred
      if (ownTransaction && queryRunner && queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      this.logger.error(
        `Error assigning role to user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to assign role');
    } finally {
      // Release resources if we own the transaction
      if (ownTransaction && queryRunner) {
        await queryRunner.release();
      }
    }
  }

  /**
   * Remove a role from a user with transaction support
   * @param user User entity
   * @param roleId Role ID to remove
   * @param transactionRunner Optional transaction QueryRunner
   * @returns Updated user entity
   */
  async removeRoleFromUser(
    user: User,
    roleId: string,
    transactionRunner?: QueryRunner,
  ): Promise<User> {
    let queryRunner: QueryRunner | null = null;
    let ownTransaction = false;

    try {
      // Setup transaction if not provided
      if (!transactionRunner) {
        queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        ownTransaction = true;
      } else {
        queryRunner = transactionRunner;
      }

      if (!user.roles) {
        return user;
      }

      // Remove role and save
      user.roles = user.roles.filter((role) => role.id !== roleId);
      await queryRunner.manager.save(user);

      // If we're managing our own transaction, commit it
      if (ownTransaction && queryRunner) {
        await queryRunner.commitTransaction();
      }

      return user;
    } catch (error) {
      // Roll back transaction if we own it and an error occurred
      if (ownTransaction && queryRunner && queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      this.logger.error(
        `Error removing role from user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to remove role');
    } finally {
      // Release resources if we own the transaction
      if (ownTransaction && queryRunner) {
        await queryRunner.release();
      }
    }
  }

  /**
   * Find users by OAuth provider ID
   * @param provider OAuth provider name
   * @param id OAuth provider user ID
   * @returns User entity or null if not found
   */
  async findByOAuthId(
    provider: 'google' | 'github',
    id: string,
  ): Promise<User | null> {
    try {
      if (provider === 'google') {
        return this.userRepo.findOne({ where: { googleId: id } });
      } else if (provider === 'github') {
        return this.userRepo.findOne({ where: { githubId: id } });
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding user by OAuth ID: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error retrieving user by OAuth ID',
      );
    }
  }

  /**
   * Increment failed login attempts with transaction support
   * @param user User entity
   * @param transactionRunner Optional transaction QueryRunner
   * @returns Updated user entity
   */
  async incrementLoginAttempts(
    user: User,
    transactionRunner?: QueryRunner,
  ): Promise<User> {
    let queryRunner: QueryRunner | null = null;
    let ownTransaction = false;

    try {
      // Setup transaction if not provided
      if (!transactionRunner) {
        queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        ownTransaction = true;
      } else {
        queryRunner = transactionRunner;
      }

      // Increment attempts
      user.loginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.isLocked = true;
        // Lock for 15 minutes
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await queryRunner.manager.save(user);

      // If we're managing our own transaction, commit it
      if (ownTransaction && queryRunner) {
        await queryRunner.commitTransaction();
      }

      return user;
    } catch (error) {
      // Roll back transaction if we own it and an error occurred
      if (ownTransaction && queryRunner && queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      this.logger.error(
        `Error incrementing login attempts: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update login attempts');
    } finally {
      // Release resources if we own the transaction
      if (ownTransaction && queryRunner) {
        await queryRunner.release();
      }
    }
  }

  /**
   * Reset login attempts counter when login is successful
   * @param user User entity
   * @param transactionRunner Optional transaction QueryRunner
   * @returns Updated user entity
   */
  async resetLoginAttempts(
    user: User,
    transactionRunner?: QueryRunner,
  ): Promise<User> {
    let queryRunner: QueryRunner | null = null;
    let ownTransaction = false;

    try {
      // Setup transaction if not provided
      if (!transactionRunner) {
        queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        ownTransaction = true;
      } else {
        queryRunner = transactionRunner;
      }

      user.loginAttempts = 0;
      user.isLocked = false;
      user.lockUntil = null as unknown as Date;
      user.lastLoginAt = new Date();
      await queryRunner.manager.save(user);

      // If we're managing our own transaction, commit it
      if (ownTransaction && queryRunner) {
        await queryRunner.commitTransaction();
      }

      return user;
    } catch (error) {
      // Roll back transaction if we own it and an error occurred
      if (ownTransaction && queryRunner && queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      this.logger.error(
        `Error resetting login attempts: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to reset login attempts');
    } finally {
      // Release resources if we own the transaction
      if (ownTransaction && queryRunner) {
        await queryRunner.release();
      }
    }
  }

  /**
   * Count total users
   * @returns Number of users
   */
  async count(): Promise<number> {
    try {
      return await this.userRepo.count();
    } catch (error) {
      this.logger.error(`Error counting users: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error counting users');
    }
  }

  /**
   * Find users by their roles
   * @param roleNames Array of role names to match
   * @returns Array of matching users
   */
  async findByRoles(roleNames: string[]): Promise<User[]> {
    try {
      return this.userRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'role')
        .where('role.name IN (:...roleNames)', { roleNames })
        .getMany();
    } catch (error) {
      this.logger.error(
        `Error finding users by roles: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error finding users by roles');
    }
  }
}
