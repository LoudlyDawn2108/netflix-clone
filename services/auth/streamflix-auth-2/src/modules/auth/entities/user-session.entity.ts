import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('user_sessions')
export class UserSession extends BaseEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  @Index()
  username: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  deviceId: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  source: string;

  @Column({ default: false })
  mfaCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @Index()
  lastActivityAt: Date;

  @Column()
  @Index()
  expiresAt: Date;

  @Column({ default: true })
  @Index()
  active: boolean;
}
