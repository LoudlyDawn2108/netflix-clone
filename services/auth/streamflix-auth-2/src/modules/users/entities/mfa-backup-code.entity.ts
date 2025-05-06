import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { Exclude } from 'class-transformer';

@Entity('mfa_backup_codes')
export class MfaBackupCode extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: string;

  @Column()
  @Exclude()
  code: string;

  @Column({ default: false })
  used: boolean;

  @Column()
  expiresAt: Date;
}
