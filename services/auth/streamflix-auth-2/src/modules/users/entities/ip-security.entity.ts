import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('ip_security')
export class IpSecurity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column()
  ipAddress: string;

  @Column()
  type: string; // 'whitelist', 'blacklist', 'suspicious'

  @Column({ nullable: true })
  countryCode: string;

  @Column({ nullable: true })
  countryName: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  expiresAt: Date;
}
