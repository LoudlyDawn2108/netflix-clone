import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordPolicyService {
  private readonly minLength: number;
  private readonly requireUppercase: boolean;
  private readonly requireLowercase: boolean;
  private readonly requireNumbers: boolean;
  private readonly requireSpecialChars: boolean;
  private readonly maxPasswordAge: number; // in days

  constructor(private configService: ConfigService) {
    // Load password policy configuration
    this.minLength = this.configService.get<number>(
      'security.passwordMinLength',
      8,
    );
    this.requireUppercase = this.configService.get<boolean>(
      'security.passwordRequireUppercase',
      true,
    );
    this.requireLowercase = this.configService.get<boolean>(
      'security.passwordRequireLowercase',
      true,
    );
    this.requireNumbers = this.configService.get<boolean>(
      'security.passwordRequireNumbers',
      true,
    );
    this.requireSpecialChars = this.configService.get<boolean>(
      'security.passwordRequireSpecialChars',
      true,
    );
    this.maxPasswordAge = this.configService.get<number>(
      'security.maxPasswordAge',
      90,
    ); // 90 days
  }

  /**
   * Check if a password meets the strength requirements
   */
  meetsStrengthRequirements(password: string): {
    valid: boolean;
    message?: string;
  } {
    // Check minimum length
    if (password.length < this.minLength) {
      return {
        valid: false,
        message: `Password must be at least ${this.minLength} characters long`,
      };
    }

    // Check for uppercase letters
    if (this.requireUppercase && !/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter',
      };
    }

    // Check for lowercase letters
    if (this.requireLowercase && !/[a-z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one lowercase letter',
      };
    }

    // Check for numbers
    if (this.requireNumbers && !/\d/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one number',
      };
    }

    // Check for special characters
    if (this.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one special character',
      };
    }

    return { valid: true };
  }

  /**
   * Calculate password strength score (0-100)
   * This is a simplified implementation - in production you might use zxcvbn or a similar library
   */
  calculatePasswordStrength(password: string): number {
    let score = 0;

    // Length contribution (up to 40 points)
    score += Math.min(40, password.length * 4);

    // Character variety contribution (up to 40 points)
    if (/[A-Z]/.test(password)) score += 10;
    if (/[a-z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;

    // Complexity patterns contribution (up to 20 points)
    if (/[A-Z].*[A-Z]/.test(password)) score += 5; // Multiple uppercase
    if (/[a-z].*[a-z]/.test(password)) score += 5; // Multiple lowercase
    if (/\d.*\d/.test(password)) score += 5; // Multiple numbers
    if (/[^a-zA-Z0-9].*[^a-zA-Z0-9]/.test(password)) score += 5; // Multiple special chars

    return Math.min(100, score);
  }

  /**
   * Check if a password is in the user's password history
   * @param password The plaintext password to check
   * @param passwordHistory Array of hashed previous passwords
   * @returns boolean True if the password is in history
   */
  async isPasswordInHistory(
    password: string,
    passwordHistory: string[],
  ): Promise<boolean> {
    // No history to check
    if (!passwordHistory || passwordHistory.length === 0) {
      return false;
    }

    // Check each password in history
    for (const hashedPassword of passwordHistory) {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      if (isMatch) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a password has been compromised (appears in known data breaches)
   * This is a simplified implementation - in production you would use APIs like "Have I Been Pwned"
   */
  async isPasswordCompromised(password: string): Promise<boolean> {
    // Common passwords list - in production, use a proper API or database
    const commonPasswords = [
      'password',
      'password123',
      '123456',
      'qwerty',
      'admin',
      'welcome',
      'login',
      'abc123',
      'football',
      'iloveyou',
    ];

    const lowercasePassword = password.toLowerCase();
    return commonPasswords.includes(lowercasePassword);
  }

  /**
   * Check if a password meets all policy requirements
   */
  async validatePassword(
    password: string,
    passwordHistory: string[] = [],
  ): Promise<{ valid: boolean; message?: string }> {
    // Check strength requirements
    const strengthCheck = this.meetsStrengthRequirements(password);
    if (!strengthCheck.valid) {
      return strengthCheck;
    }

    // Check if password is in history
    if (await this.isPasswordInHistory(password, passwordHistory)) {
      return {
        valid: false,
        message:
          'Password has been used recently. Please choose a different password.',
      };
    }

    // Check if password is compromised
    if (await this.isPasswordCompromised(password)) {
      return {
        valid: false,
        message:
          'This password appears in a data breach. Please choose a stronger password.',
      };
    }

    return { valid: true };
  }

  /**
   * Check if a password has expired
   */
  isPasswordExpired(lastPasswordChangeDate: Date): boolean {
    if (!this.maxPasswordAge || this.maxPasswordAge <= 0) {
      return false; // No expiration policy
    }

    if (!lastPasswordChangeDate) {
      return true; // No change date, assume expired
    }

    const now = new Date();
    const expiryDate = new Date(lastPasswordChangeDate);
    expiryDate.setDate(expiryDate.getDate() + this.maxPasswordAge);

    return now > expiryDate;
  }
}
