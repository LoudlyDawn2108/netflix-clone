import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  resource: string;

  @Column({ nullable: true })
  action: string;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ nullable: true })
  scope: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
