import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserRole } from '../enums/user-role.enum';
import { ConfigService } from '@nestjs/config';
import { Exclude } from 'class-transformer';
import { OAuthIdentity } from './oauth-identity.entity';
import { Role } from './role.entity';
import { MfaBackupCode } from './mfa-backup-code.entity';
import { TrustedDevice } from './trusted-device.entity';
import { IpSecurity } from './ip-security.entity';
import { SecurityAuditLog } from './security-audit-log.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ select: false, nullable: true })
  @Exclude()
  password: string;

  // Keep legacy role for backward compatibility
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  // New RBAC - many-to-many relationship with roles
  @ManyToMany(() => Role, (role) => role.users, {
    cascade: true,
  })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @Column({ nullable: true })
  @Exclude()
  refreshToken: string;

  // Enhanced MFA fields
  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true })
  @Exclude()
  mfaSecret: string;

  @Column({ default: 'none' })
  mfaType: string; // 'none', 'totp', 'sms', 'email'

  @Column({ nullable: true })
  @Exclude()
  mfaPhone: string;

  @Column({ default: false })
  mfaEnforced: boolean; // Admin required MFA

  @Column({ nullable: true })
  mfaLastVerified: Date;

  // Security fields
  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockUntil: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLogin: Date;

  @Column({ nullable: true })
  lastFailedLogin: Date;

  @Column({ nullable: true })
  lastPasswordChange: Date;

  @Column('simple-array', { nullable: true })
  @Exclude()
  passwordHistory: string[];

  @Column({ nullable: true })
  avatarUrl: string;

  // Security risk scoring
  @Column({ default: 0 })
  securityRiskScore: number;

  // Geographical security
  @Column({ nullable: true })
  lastLoginCountry: string;

  @Column({ nullable: true })
  lastLoginIp: string;

  // Security preferences
  @Column({ default: false })
  notifyOnUnrecognizedLogin: boolean;

  @Column({ default: false })
  restrictLoginByCountry: boolean;

  @Column({ type: 'simple-array', nullable: true })
  allowedCountries: string[];

  // OAuth relationships
  @OneToMany(() => OAuthIdentity, (oauthIdentity) => oauthIdentity.user)
  oauthIdentities: OAuthIdentity[];

  // Security relationships
  @OneToMany(() => MfaBackupCode, (backupCode) => backupCode.user)
  mfaBackupCodes: MfaBackupCode[];

  @OneToMany(() => TrustedDevice, (device) => device.user)
  trustedDevices: TrustedDevice[];

  @OneToMany(() => IpSecurity, (ipSecurity) => ipSecurity.user)
  ipSecuritySettings: IpSecurity[];

  @OneToMany(() => SecurityAuditLog, (log) => log.user)
  securityAuditLogs: SecurityAuditLog[];

  // Virtual fields
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || '';
  }

  get isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  // Flag to identify if user was created through OAuth
  get isOAuthUser(): boolean {
    return !this.password;
  }

  // Additional methods for RBAC
  hasRole(roleName: string): boolean {
    if (!this.roles || this.roles.length === 0) {
      return this.role === roleName;
    }
    return this.roles.some((role) => role.name === roleName);
  }

  hasPermission(permissionName: string): boolean {
    if (!this.roles || this.roles.length === 0) {
      return false;
    }

    return this.roles.some(
      (role) =>
        role.permissions &&
        role.permissions.some(
          (permission) => permission.name === permissionName,
        ),
    );
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash if password exists (will be null for OAuth-only users)
    if (this.password) {
      // Using a temporary ConfigService to get hash rounds
      // In a real implementation, use dependency injection
      const rounds = process.env.PASSWORD_HASH_ROUNDS
        ? parseInt(process.env.PASSWORD_HASH_ROUNDS, 10)
        : 12;

      // Store current password in history before updating
      if (this.id) {
        // Only track history for existing users (not during creation)
        if (!this.passwordHistory) {
          this.passwordHistory = [];
        }

        // Get the current password from the database if available
        // In a real implementation, this would be handled better
        const currentPassword = this.password;
        if (currentPassword && !currentPassword.startsWith('$2b$')) {
          // If we're changing the password, add the current one to history
          const hashedCurrent = await bcrypt.hash(currentPassword, rounds);

          // Limit history to last 5 passwords
          const maxHistorySize = 5;
          this.passwordHistory.push(hashedCurrent);
          if (this.passwordHistory.length > maxHistorySize) {
            this.passwordHistory = this.passwordHistory.slice(-maxHistorySize);
          }

          // Update last password change date
          this.lastPasswordChange = new Date();
        }
      } else {
        // For new users, initialize password history
        this.passwordHistory = [];
        this.lastPasswordChange = new Date();
      }

      // Hash the new password
      this.password = await bcrypt.hash(this.password, rounds);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.password) {
      return false; // OAuth users without password can't use password login
    }
    return bcrypt.compare(password, this.password);
  }
}
