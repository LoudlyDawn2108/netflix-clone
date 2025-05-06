import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
  AfterInsert,
  AfterUpdate,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from './role.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserEventTypes } from '../../common/events/user.events';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index('idx_user_email_lower')
  email: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true }) // Exclude from response serialization
  password: string;

  @Column({ nullable: false, unique: true })
  @Index('idx_user_username_lower')
  username: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ default: false })
  @Index('idx_user_verified')
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerifiedAt: Date;

  @Column({ nullable: true })
  @Index('idx_user_verif_token')
  emailVerificationToken: string;

  @Column({ nullable: true })
  @Index('idx_user_verif_expires')
  emailVerificationExpires: Date;

  // Track verification attempt count for rate limiting
  @Column({ type: 'int', default: 0 })
  emailVerificationAttempts: number;

  // Track when the last verification email was sent
  @Column({ nullable: true })
  lastVerificationSentAt: Date;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  @Index('idx_user_reset_expires')
  passwordResetExpires: Date;

  // Password history to prevent reuse of old passwords
  @Column('simple-array', { nullable: true })
  @Exclude({ toPlainOnly: true })
  passwordHistory: string[];

  // Last password change date
  @Column({ nullable: true })
  passwordChangedAt: Date;

  @Column({ default: true })
  @Index('idx_user_active')
  isActive: boolean;

  @Column({ default: false })
  @Index('idx_user_locked')
  isLocked: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ nullable: true })
  lockUntil: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  // OAuth providers
  @Column({ nullable: true })
  @Index('idx_user_google_id')
  googleId: string;

  @Column({ nullable: true })
  @Index('idx_user_github_id')
  githubId: string;

  // Private property for event emission, set by the repository
  private eventEmitter?: EventEmitter2;

  /**
   * Set event emitter for this instance
   * Used by repositories to enable entity-level events
   */
  setEventEmitter(emitter: EventEmitter2) {
    this.eventEmitter = emitter;
  }

  /**
   * After user insertion
   */
  @AfterInsert()
  afterInsert() {
    // Emit user created event if emitter is available
    if (this.eventEmitter) {
      try {
        this.eventEmitter.emit(UserEventTypes.CREATED, {
          type: UserEventTypes.CREATED,
          userId: this.id,
          timestamp: new Date(),
          metadata: {
            email: this.email,
            username: this.username,
            isEmailVerified: this.isEmailVerified,
          },
        });
      } catch (error) {
        // Swallow errors during event emission to prevent transaction failure
      }
    }
  }

  /**
   * After user update
   */
  @AfterUpdate()
  afterUpdate() {
    // Emit appropriate events based on what was updated
    if (this.eventEmitter) {
      try {
        // If email was verified, emit that event
        if (this.isEmailVerified) {
          this.eventEmitter.emit(UserEventTypes.EMAIL_VERIFIED, {
            type: UserEventTypes.EMAIL_VERIFIED,
            userId: this.id,
            timestamp: new Date(),
            metadata: {
              email: this.email,
            },
          });
        }
      } catch (error) {
        // Swallow errors during event emission to prevent transaction failure
      }
    }
  }

  // Utility methods
  isPasswordLocked(): boolean {
    return this.isLocked && new Date() < this.lockUntil;
  }

  @BeforeInsert()
  @BeforeUpdate()
  emailToLowerCase() {
    this.email = this.email.toLowerCase();
  }

  // For profile display
  getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.email.split('@')[0];
  }

  hasRole(roleName: string): boolean {
    return this.roles?.some((role) => role.name === roleName) || false;
  }
}
