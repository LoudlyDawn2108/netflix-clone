import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('security_audit_logs')
export class SecurityAuditLog extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column()
  @Index()
  eventType: string; // 'login', 'login_failed', 'mfa_enabled', 'logout', etc.

  @Column()
  eventSeverity: string; // 'info', 'warning', 'error', 'critical'

  @Column({ type: 'jsonb', nullable: true })
  eventData: any; // Store additional event-specific data

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  deviceInfo: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ default: false })
  isSuspicious: boolean;

  @Column({ default: 0 })
  riskScore: number;

  @Column({ nullable: true })
  message: string;

  // Field for tamper-evident logging
  @Column({ nullable: true })
  hashChain: string; // Contains hash of previous record + current record data
}
