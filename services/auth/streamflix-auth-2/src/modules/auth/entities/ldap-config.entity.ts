import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('ldap_configs')
export class LDAPConfig extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  name: string;

  @Column()
  host: string;

  @Column()
  port: number;

  @Column({ default: false })
  useSSL: boolean;

  @Column()
  baseDN: string;

  @Column()
  bindDN: string;

  @Column({ select: false })
  bindPassword: string;

  @Column()
  searchFilter: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  attributeMapping: Record<string, string>;

  @Column({ nullable: true })
  groupSearchBase: string;

  @Column({ nullable: true })
  groupSearchFilter: string;

  @Column({ nullable: true })
  groupMemberAttribute: string;

  @Column({ type: 'jsonb', nullable: true })
  connectionOptions: Record<string, any>;
}
