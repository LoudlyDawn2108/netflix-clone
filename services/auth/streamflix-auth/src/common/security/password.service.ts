import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly saltRounds: number;
  private readonly useArgon2: boolean;

  // Argon2 parameters
  private readonly argon2MemoryCost: number;
  private readonly argon2TimeCost: number;
  private readonly argon2Parallelism: number;

  constructor(private readonly configService: ConfigService) {
    // Set bcrypt cost factor to 12 as per requirements (fallback)
    this.saltRounds = configService.get<number>('BCRYPT_SALT_ROUNDS', 12);

    // Check whether to use Argon2id (default to true)
    this.useArgon2 = configService.get<boolean>('USE_ARGON2', true);

    // Argon2id configuration parameters
    this.argon2MemoryCost = configService.get<number>(
      'ARGON2_MEMORY_COST',
      4096,
    ); // 4MB memory usage
    this.argon2TimeCost = configService.get<number>('ARGON2_TIME_COST', 3); // Number of iterations
    this.argon2Parallelism = configService.get<number>('ARGON2_PARALLELISM', 1); // Parallelism factor

    this.logger.log(
      `Password service initialized with: ${this.useArgon2 ? 'Argon2id' : 'bcrypt'}`,
    );
    if (this.useArgon2) {
      this.logger.log(
        `Argon2id config: memory=${this.argon2MemoryCost}KB, time=${this.argon2TimeCost}, parallelism=${this.argon2Parallelism}`,
      );
    } else {
      this.logger.log(`bcrypt config: salt rounds=${this.saltRounds}`);
    }
  }

  /**
   * Hash a password using Argon2id (preferred) or bcrypt
   * @param password The plain text password to hash
   * @returns Promise resolving to the hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      if (this.useArgon2) {
        // Use Argon2id (recommended for password hashing)
        return await argon2.hash(password, {
          type: argon2.argon2id, // Argon2id variant
          memoryCost: this.argon2MemoryCost,
          timeCost: this.argon2TimeCost,
          parallelism: this.argon2Parallelism,
        });
      } else {
        // Fallback to bcrypt
        return await bcrypt.hash(password, this.saltRounds);
      }
    } catch (error) {
      this.logger.error(
        `Error hashing password: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Validate a password against a stored hash
   * Automatically detects hash type (Argon2id or bcrypt)
   * @param password The plain text password to check
   * @param hashedPassword The hashed password to compare against
   * @returns Promise resolving to boolean indicating if passwords match
   */
  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      // Auto-detect the hash type
      if (hashedPassword.startsWith('$argon2')) {
        // Argon2 hash
        return await argon2.verify(hashedPassword, password);
      } else if (hashedPassword.startsWith('$2')) {
        // bcrypt hash
        return await bcrypt.compare(password, hashedPassword);
      } else {
        this.logger.warn('Unknown password hash format');
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error validating password: ${error.message}`,
        error.stack,
      );
      return false; // Fail securely
    }
  }

  /**
   * Determine if a password hash needs to be upgraded
   * For example, if we switched from bcrypt to Argon2id, or changed hash parameters
   * @param hashedPassword The existing hashed password
   * @returns Boolean indicating if rehash is needed
   */
  isRehashNeeded(hashedPassword: string): boolean {
    // If we're using Argon2id but the hash is bcrypt, rehash is needed
    if (this.useArgon2 && hashedPassword.startsWith('$2')) {
      return true;
    }

    // If using bcrypt but the hash is Argon2, no rehash needed
    // (downgrading from Argon2 to bcrypt would reduce security)
    if (!this.useArgon2 && hashedPassword.startsWith('$argon2')) {
      return false;
    }

    // Logic for future parameter upgrades could be added here

    return false;
  }

  /**
   * Generate a secure password hash synchronously (for use in seed scripts)
   * @param password The plain text password to hash
   * @returns The hashed password
   */
  hashPasswordSync(password: string): string {
    try {
      // Always fall back to bcrypt for sync operations
      // since argon2 doesn't provide synchronous methods
      return bcrypt.hashSync(password, this.saltRounds);
    } catch (error) {
      this.logger.error(`Error in sync password hashing: ${error.message}`);
      throw new Error('Failed to hash password synchronously');
    }
  }

  /**
   * Check if a password meets basic security requirements
   * This is a fallback check for scenarios where the class-validator can't be used
   * @param password Password to check
   * @returns Boolean indicating if password meets requirements
   */
  meetsBasicRequirements(password: string): boolean {
    if (!password || typeof password !== 'string') return false;

    // Minimum length
    if (password.length < 12) return false;

    // Must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;

    // Must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) return false;

    // Must contain at least one digit
    if (!/\d/.test(password)) return false;

    // Must contain at least one special character
    if (!/[^A-Za-z0-9]/.test(password)) return false;

    return true;
  }
}
