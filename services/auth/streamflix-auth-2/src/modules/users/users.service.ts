import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Role } from './entities/role.entity';
import { RoleService } from './services/role.service';

// Define pagination params interface
export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly configService: ConfigService,
    private readonly roleService: RoleService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findAllPaginated(
    params: PaginationParams = {},
  ): Promise<PaginatedResult<User>> {
    const {
      page = 1,
      limit = 10,
      orderBy = 'createdAt',
      order = 'DESC',
      search = '',
    } = params;

    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Add search functionality if search param is provided
    if (search) {
      queryBuilder.where(
        '(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Add ordering
    queryBuilder.orderBy(`user.${orderBy}`, order);

    // Get total count
    const total = await queryBuilder.getCount();

    // Add pagination
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string, options?: any): Promise<User | null> {
    if (!email && !options) {
      return null;
    }

    // Create query builder to include password field which is select:false by default
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password'); // Explicitly select the password field

    // Add filter by email if provided
    if (email) {
      queryBuilder.where('user.email = :email', { email });
    }

    // Add additional conditions if provided
    if (options?.where) {
      const whereConditions = options.where;

      Object.keys(whereConditions).forEach((key) => {
        // Special handling for dates with comparison operators
        if (whereConditions[key] && typeof whereConditions[key] === 'object') {
          // Handle operators like $gt, $lt, etc.
          const operator = Object.keys(whereConditions[key])[0];
          const value = whereConditions[key][operator];

          switch (operator) {
            case '$gt':
              queryBuilder.andWhere(`user.${key} > :${key}Value`, {
                [`${key}Value`]: value,
              });
              break;
            case '$lt':
              queryBuilder.andWhere(`user.${key} < :${key}Value`, {
                [`${key}Value`]: value,
              });
              break;
            case '$gte':
              queryBuilder.andWhere(`user.${key} >= :${key}Value`, {
                [`${key}Value`]: value,
              });
              break;
            case '$lte':
              queryBuilder.andWhere(`user.${key} <= :${key}Value`, {
                [`${key}Value`]: value,
              });
              break;
            default:
              queryBuilder.andWhere(`user.${key} = :${key}Value`, {
                [`${key}Value`]: value,
              });
          }
        } else {
          // Simple equality
          queryBuilder.andWhere(`user.${key} = :${key}Value`, {
            [`${key}Value`]: whereConditions[key],
          });
        }
      });
    }

    return queryBuilder.getOne();
  }

  async findByOAuth(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { provider, providerId },
    });
  }

  async create(userData: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(userData.email || '');
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // For OAuth users, we may not have a password
    let hashedPassword: string | undefined = undefined;
    if (userData.password) {
      const hashRounds =
        this.configService.get<number>('security.passwordHashRounds') || 12;
      hashedPassword = await bcrypt.hash(userData.password, hashRounds);
    }

    const newUser = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
      emailVerificationToken: userData.emailVerified ? null : uuidv4(),
      lastPasswordChange: userData.password ? new Date() : null,
      passwordHistory: [],
    });

    return this.usersRepository.save(newUser);
  }

  async createOAuthUser(profile: {
    email: string;
    firstName?: string;
    lastName?: string;
    provider: string;
    providerId: string;
  }): Promise<User> {
    // Check if user already exists by OAuth provider info
    let user = await this.findByOAuth(profile.provider, profile.providerId);

    // If found, return the user
    if (user) {
      return user;
    }

    // Check if user exists with same email
    user = await this.findByEmail(profile.email);

    // If user exists with email, link the OAuth account
    if (user) {
      user.provider = profile.provider;
      user.providerId = profile.providerId;
      user.emailVerified = true; // OAuth emails are considered verified
      return this.usersRepository.save(user);
    }

    // Create new user if doesn't exist
    const newUser = await this.create({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      provider: profile.provider,
      providerId: profile.providerId,
      emailVerified: true, // OAuth emails are considered verified
    });

    return newUser;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Create a clean partial update object
    const updateData: Record<string, any> = {};

    // Only include properties that are defined in updateUserDto
    Object.keys(updateUserDto).forEach((key) => {
      if (updateUserDto[key as keyof UpdateUserDto] !== undefined) {
        updateData[key] = updateUserDto[key as keyof UpdateUserDto];
      }
    });

    // Special handling for password changes
    if (updateData.password) {
      const hashRounds =
        this.configService.get<number>('security.passwordHashRounds') || 12;

      // Initialize or retrieve passwordHistory
      if (!user.passwordHistory) {
        user.passwordHistory = [];
      }

      // Store current password in history
      user.passwordHistory.push(user.password);

      // Limit history to configured size
      const historySize =
        this.configService.get<number>('security.passwordHistorySize') || 5;
      if (user.passwordHistory.length > historySize) {
        user.passwordHistory = user.passwordHistory.slice(-historySize);
      }

      // Update lastPasswordChange
      updateData.lastPasswordChange = new Date();
    }

    // Apply the updates to the user entity
    const updatedUser = this.usersRepository.merge(user, updateData);

    return this.usersRepository.save(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  async setRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<User> {
    const user = await this.findById(userId);

    if (refreshToken) {
      const hashRounds =
        this.configService.get<number>('security.passwordHashRounds') || 12;
      user.refreshToken = await bcrypt.hash(refreshToken, hashRounds);
      return this.usersRepository.save(user);
    } else {
      // Set to empty string instead of null to comply with type requirements
      user.refreshToken = '';
      return this.usersRepository.save(user);
    }
  }

  async findByRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<User | null> {
    const user = await this.findById(userId);

    if (!user || !user.refreshToken) {
      return null;
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      return null;
    }

    return user;
  }

  async verifyEmail(token: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null as unknown as string;

    return this.usersRepository.save(user);
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    const hashRounds =
      this.configService.get<number>('security.passwordHashRounds') || 12;
    const hashedPassword = await bcrypt.hash(newPassword, hashRounds);

    // Update password history
    if (!user.passwordHistory) {
      user.passwordHistory = [];
    }

    user.passwordHistory.push(user.password);

    // Limit history to configured size
    const historySize =
      this.configService.get<number>('security.passwordHistorySize') || 5;
    if (user.passwordHistory.length > historySize) {
      user.passwordHistory = user.passwordHistory.slice(-historySize);
    }

    // Update password and lastPasswordChange
    user.password = hashedPassword;
    user.lastPasswordChange = new Date();

    await this.usersRepository.save(user);
  }

  async clearLockout(userId: string): Promise<User> {
    // Use the update method to properly handle null values
    return this.update(userId, {
      failedLoginAttempts: 0,
      lockUntil: null,
    });
  }

  async updateLoginTimestamp(userId: string): Promise<User> {
    return this.update(userId, {
      lastLogin: new Date(),
      failedLoginAttempts: 0,
    });
  }

  async recordFailedLoginAttempt(userId: string): Promise<User> {
    const user = await this.findById(userId);
    user.failedLoginAttempts += 1;

    const maxFailedAttempts =
      this.configService.get<number>('security.maxFailedLoginAttempts') || 5;

    // Lock the account if max attempts reached
    if (user.failedLoginAttempts >= maxFailedAttempts) {
      const lockoutHours =
        this.configService.get<number>('security.accountLockoutHours') || 1;
      const lockUntil = new Date();
      lockUntil.setHours(lockUntil.getHours() + lockoutHours);
      user.lockUntil = lockUntil;
    }

    return this.usersRepository.save(user);
  }

  // Method to find users with transaction support
  async findWithTransaction<T>(
    callback: (repository: Repository<User>) => Promise<T>,
  ): Promise<T> {
    const queryRunner =
      this.usersRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner.manager.getRepository(User));
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Find a user with additional options
  async findOne(options: any): Promise<User | null> {
    return this.findByEmail('', options);
  }

  /**
   * Get roles assigned to a user
   */
  async getUserRoles(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      userId: user.id,
      legacyRole: user.role,
      roles: user.roles || [],
    };
  }

  /**
   * Assign roles to a user
   */
  async assignRolesToUser(userId: string, roleIds: string[]) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find all roles by IDs
    const roles = await this.roleRepository.findByIds(roleIds);

    if (roles.length !== roleIds.length) {
      const foundIds = roles.map((role) => role.id);
      const missingIds = roleIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Roles not found: ${missingIds.join(', ')}`);
    }

    // Set the roles
    user.roles = roles;

    // Update the user
    await this.usersRepository.save(user);

    return this.getUserRoles(userId);
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(userId: string, roleId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.roles || user.roles.length === 0) {
      throw new BadRequestException(`User has no roles assigned`);
    }

    // Check if the role exists and is assigned
    const roleIndex = user.roles.findIndex((role) => role.id === roleId);
    if (roleIndex === -1) {
      throw new NotFoundException(
        `Role with ID ${roleId} not assigned to user`,
      );
    }

    // Remove the role
    user.roles.splice(roleIndex, 1);

    // Update the user
    await this.usersRepository.save(user);
  }

  /**
   * Convert legacy role to new RBAC roles
   */
  async migrateLegacyRole(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.role) {
      throw new BadRequestException(`User has no legacy role to migrate`);
    }

    // Get the role mapping
    const roleMapping = await this.roleService.getUserRoleToSystemRoleMapping();
    const systemRoleName = roleMapping.get(user.role);

    if (!systemRoleName) {
      throw new BadRequestException(
        `No mapping found for legacy role ${user.role}`,
      );
    }

    // Find the equivalent system role
    const systemRole = await this.roleRepository.findOne({
      where: { name: systemRoleName },
    });

    if (!systemRole) {
      throw new NotFoundException(`System role ${systemRoleName} not found`);
    }

    // Initialize roles array if needed
    if (!user.roles) {
      user.roles = [];
    }

    // Check if the role is already assigned
    if (!user.roles.some((role) => role.id === systemRole.id)) {
      user.roles.push(systemRole);
      await this.usersRepository.save(user);
    }
  }

  /**
   * Create a new user within a transaction
   */
  async createWithTransaction(
    userData: Partial<User>,
    queryRunner: any,
  ): Promise<User> {
    const user = this.usersRepository.create(userData);

    // Save the user using the provided queryRunner to ensure it's within the transaction
    return queryRunner.manager.save(user);
  }

  /**
   * Update a user within a transaction
   */
  async updateWithTransaction(
    id: string,
    updateData: Partial<User>,
    queryRunner: any,
  ): Promise<User> {
    // First find the user
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update user properties
    Object.assign(user, updateData);

    // Save using the provided queryRunner to ensure it's within the transaction
    return queryRunner.manager.save(user);
  }
}
