import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

/**
 * Mock database service to use for testing when PostgreSQL connection issues occur
 */
@Injectable()
export class MockDatabaseService {
  private readonly logger = new Logger(MockDatabaseService.name);

  // Mock data storage
  private users: User[] = [];
  private roles: Role[] = [];
  private permissions: Permission[] = [];
  private idCounters = {
    users: 1,
    roles: 1,
    permissions: 1,
  };

  constructor() {
    this.logger.log('Initializing mock database service');
    this.seedInitialData();
  }

  /**
   * Seed some initial test data
   */
  private seedInitialData() {
    // Create permissions
    const readUsers = this.createPermission('read:users', 'Can read user data');
    const writeUsers = this.createPermission(
      'write:users',
      'Can create and update users',
    );
    const deleteUsers = this.createPermission(
      'delete:users',
      'Can delete users',
    );
    const readContent = this.createPermission(
      'read:content',
      'Can access content',
    );

    // Create roles
    const userRole = this.createRole('user', 'Standard user', [readContent]);
    const adminRole = this.createRole('admin', 'Administrator', [
      readUsers,
      writeUsers,
      deleteUsers,
      readContent,
    ]);

    // Create users
    this.createUser('user@example.com', 'password', 'Test User', [userRole]);
    this.createUser('admin@example.com', 'password', 'Test Admin', [adminRole]);

    this.logger.log(
      `Mock database initialized with ${this.users.length} users, ${this.roles.length} roles, and ${this.permissions.length} permissions`,
    );
  }

  /**
   * Create a new permission
   */
  createPermission(name: string, description: string): Permission {
    const permission = new Permission();
    permission.id = (this.idCounters.permissions++).toString();
    permission.name = name;
    permission.description = description;
    permission.createdAt = new Date();
    permission.updatedAt = new Date();

    this.permissions.push(permission);
    return permission;
  }

  /**
   * Create a new role
   */
  createRole(
    name: string,
    description: string,
    permissions: Permission[],
  ): Role {
    const role = new Role();
    role.id = (this.idCounters.roles++).toString();
    role.name = name;
    role.description = description;
    role.permissions = [...permissions];
    role.createdAt = new Date();
    role.updatedAt = new Date();

    this.roles.push(role);
    return role;
  }

  /**
   * Create a new user
   */
  createUser(
    email: string,
    password: string,
    name: string,
    roles: Role[],
  ): User {
    const user = new User();
    user.id = (this.idCounters.users++).toString();
    user.email = email;
    user.password = password; // In a real implementation, this would be hashed
    user.username = name;
    user.roles = [...roles];
    user.createdAt = new Date();
    user.updatedAt = new Date();

    this.users.push(user);
    return user;
  }

  /**
   * Find a user by email
   */
  findUserByEmail(email: string): User | null {
    return this.users.find((user) => user.email === email) || null;
  }

  /**
   * Find a user by ID
   */
  findUserById(id: number): User | null {
    return this.users.find((user) => user.id === id.toString()) || null;
  }

  /**
   * Find all users
   */
  findAllUsers(): User[] {
    return [...this.users];
  }

  /**
   * Find a role by name
   */
  findRoleByName(name: string): Role | null {
    return this.roles.find((role) => role.name === name) || null;
  }

  /**
   * Find all roles
   */
  findAllRoles(): Role[] {
    return [...this.roles];
  }

  /**
   * Find all permissions
   */
  findAllPermissions(): Permission[] {
    return [...this.permissions];
  }
}
