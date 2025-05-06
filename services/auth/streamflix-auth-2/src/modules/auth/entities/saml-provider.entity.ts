import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('saml_providers')
export class SAMLProvider extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  name: string;

  @Column()
  entityId: string;

  @Column()
  singleSignOnUrl: string;

  @Column({ nullable: true })
  singleLogoutUrl: string;

  @Column({ type: 'text' })
  x509Certificate: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  nameIdFormat: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  attributeMapping: Record<string, string>;

  @Column({ nullable: true })
  signatureAlgorithm: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
