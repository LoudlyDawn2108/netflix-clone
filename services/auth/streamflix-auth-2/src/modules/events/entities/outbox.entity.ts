import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Outbox entity for reliably publishing events
 * Implements the Outbox pattern for reliable event publishing
 */
@Entity('outbox')
export class Outbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  type: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'boolean', default: false })
  @Index()
  processed: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  error: string;
}
