import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from '../common/security/password.service';
import { User } from '../database/entities/user.entity';

/**
 * Service to manage password history and prevent password reuse
 */
@Injectable()
export class PasswordHistoryService {
  private readonly logger = new Logger(PasswordHistoryService.name);
  private readonly historySize: number;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
  ) {
    // Number of previous passwords to keep in history
    this.historySize = this.configService.get<number>(
      'PASSWORD_HISTORY_SIZE',
      5,
    );
  }

  /**
   * Check if a password has been used previously by this user
   * @param userId User ID
   * @param newPassword Plain text new password to check
   * @returns Boolean indicating if password has been used before
   */
  async isPasswordReused(
    userId: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'password', 'passwordHistory'],
      });

      if (!user) return false;

      // Check current password
      if (user.password) {
        const currentMatch = await this.passwordService.validatePassword(
          newPassword,
          user.password,
        );

        if (currentMatch) {
          return true; // Password matches current password
        }
      }

      // Check password history if it exists
      if (user.passwordHistory && Array.isArray(user.passwordHistory)) {
        // Check each historical password hash
        for (const historicalHash of user.passwordHistory) {
          const matches = await this.passwordService.validatePassword(
            newPassword,
            historicalHash,
          );

          if (matches) {
            return true; // Password found in history
          }
        }
      }

      // Password has not been used before
      return false;
    } catch (error) {
      this.logger.error(
        `Error checking password history for user ${userId}: ${error.message}`,
        error.stack,
      );
      return false; // Default to false on error to not block registration/reset
    }
  }

  /**
   * Add current password to history when password is changed
   * @param userId User ID
   * @param oldPasswordHash Current password hash to add to history
   */
  async addToHistory(userId: string, oldPasswordHash: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'passwordHistory'],
      });

      if (!user) {
        this.logger.warn(
          `Cannot update password history: User ${userId} not found`,
        );
        return;
      }

      // Initialize history array if it doesn't exist
      let history: string[] = user.passwordHistory || [];

      // Add current password to history, ensuring it's not already there
      if (oldPasswordHash && !history.includes(oldPasswordHash)) {
        history = [oldPasswordHash, ...history];
      }

      // Trim history to max size
      if (history.length > this.historySize) {
        history = history.slice(0, this.historySize);
      }

      // Update user record with new history
      await this.userRepository.update(userId, { passwordHistory: history });
    } catch (error) {
      this.logger.error(
        `Error updating password history for user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
