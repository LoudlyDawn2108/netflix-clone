import { Entity, Column, Index, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('security_audit_events')
export class SecurityAuditEvent extends BaseEntity {
  @Column()
  @Index()
  eventType: string;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column({ nullable: true })
  @Index()
  username: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  resourceType: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  action: string;

  @Column({ nullable: true })
  @Index()
  status: string;

  @Column({ nullable: true, type: 'simple-json' })
  details: Record<string, any>;

  @Column({ nullable: true })
  sourceType: string;

  @Column({ nullable: true })
  @Index()
  severity: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
