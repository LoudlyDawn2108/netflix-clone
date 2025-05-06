import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('data_exports')
export class DataExport extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: 'pending' })
  @Index()
  status: string; // 'pending', 'processing', 'completed', 'failed'

  @Column({ default: 'json' })
  format: string; // 'json', 'csv', etc.

  @Column({ nullable: true })
  filePath: string;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date;

  @Column({ nullable: true })
  requestedBy: string;

  @Column({ default: 0 })
  downloadCount: number;
}
