import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('trusted_devices')
export class TrustedDevice extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: string;

  @Column()
  deviceId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  deviceType: string;

  @Column()
  browserInfo: string;

  @Column()
  operatingSystem: string;

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  geoData: string;

  @Column()
  lastUsedAt: Date;

  @Column({ default: 'standard' })
  trustLevel: string; // 'high', 'standard', 'low'

  @Column({ default: true })
  isActive: boolean;
}
