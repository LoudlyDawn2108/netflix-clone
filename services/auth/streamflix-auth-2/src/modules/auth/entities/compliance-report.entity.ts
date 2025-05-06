import { Entity, Column, CreateDateColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('compliance_reports')
export class ComplianceReport extends BaseEntity {
  @Column()
  @Index()
  reportType: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  @Index()
  generatedBy: string;

  @Column({ nullable: true, type: 'simple-json' })
  parameters: Record<string, any>;

  @Column({ type: 'simple-json' })
  data: Record<string, any>;

  @Column({ nullable: true })
  format: string;

  @CreateDateColumn()
  @Index()
  generatedAt: Date;

  @Column({ default: false })
  archived: boolean;
}
