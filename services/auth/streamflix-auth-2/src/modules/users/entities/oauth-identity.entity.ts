import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { Exclude } from 'class-transformer';

@Entity('oauth_identities')
export class OAuthIdentity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'provider' })
  @Index()
  provider: string;

  @Column({ name: 'provider_id' })
  @Index()
  providerId: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  rawProfile: Record<string, any>;

  @Column({ nullable: true })
  @Exclude()
  accessToken: string;

  @Column({ nullable: true })
  @Exclude()
  refreshToken: string;

  @Column({ nullable: true })
  tokenExpiresAt: Date;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastLogin: Date;
}
