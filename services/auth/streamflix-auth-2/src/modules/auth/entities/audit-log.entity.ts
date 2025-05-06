import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  action: string;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column({ nullable: true })
  @Index()
  resourceType: string;

  @Column({ nullable: true })
  @Index()
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ nullable: true })
  @Index()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'timestamp with time zone' })
  @Index()
  timestamp: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: false })
  sensitive: boolean;
}
