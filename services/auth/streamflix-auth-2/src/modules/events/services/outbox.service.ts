import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Outbox } from '../entities/outbox.entity';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { BaseEvent } from '../interfaces/base-event.interface';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly serviceName: string;
  private readonly serviceVersion: string;

  constructor(
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.serviceName = this.configService.get('app.name', 'auth-service');
    this.serviceVersion = this.configService.get('app.version', '1.0.0');
  }

  /**
   * Create an outbox entry within a transaction
   * Must be called within a transaction to ensure atomicity with the database operation
   */
  async createOutboxEntry(
    type: string,
    payload: Record<string, any>,
    queryRunner = this.dataSource.createQueryRunner(),
  ): Promise<Outbox> {
    const outboxEntry = new Outbox();
    outboxEntry.type = type;
    outboxEntry.payload = this.createEventPayload(type, payload);

    if (queryRunner.isTransactionActive) {
      return queryRunner.manager.save(outboxEntry);
    } else {
      return this.outboxRepository.save(outboxEntry);
    }
  }

  /**
   * Process unpublished outbox entries
   * This is called by a scheduled job to publish events that were stored in the outbox
   */
  @Cron('*/10 * * * * *') // Run every 10 seconds
  async processOutbox() {
    const batchSize = this.configService.get('events.outboxBatchSize', 50);
    const maxRetries = this.configService.get('events.outboxMaxRetries', 5);

    try {
      // Find unpublished entries
      const unpublishedEntries = await this.outboxRepository.find({
        where: { processed: false },
        order: { createdAt: 'ASC' },
        take: batchSize,
      });

      if (unpublishedEntries.length === 0) {
        return;
      }

      this.logger.debug(
        `Processing ${unpublishedEntries.length} outbox entries`,
      );

      for (const entry of unpublishedEntries) {
        try {
          // Publish the event
          await this.publishEvent(entry.payload);

          // Mark as processed
          await this.outboxRepository.update(entry.id, {
            processed: true,
            processedAt: new Date(),
          });
        } catch (error) {
          this.logger.error(
            `Error publishing outbox entry ${entry.id}: ${error.message}`,
          );

          // Increment retry count
          const newRetryCount = entry.retryCount + 1;

          if (newRetryCount >= maxRetries) {
            // Mark as failed after max retries
            await this.outboxRepository.update(entry.id, {
              retryCount: newRetryCount,
              error: error.message.substring(0, 50),
            });

            this.logger.warn(
              `Outbox entry ${entry.id} failed after ${maxRetries} retries`,
            );
          } else {
            // Update retry count
            await this.outboxRepository.update(entry.id, {
              retryCount: newRetryCount,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing outbox: ${error.message}`);
    }
  }

  /**
   * Publish an event to the message bus
   * In a production environment, this would publish to Kafka, RabbitMQ, etc.
   */
  private async publishEvent(event: BaseEvent): Promise<void> {
    // Log the event (in production this would be sent to a message bus)
    this.logger.log(`📣 Event published from outbox: ${event.type}`);
    this.logger.debug(JSON.stringify(event, null, 2));

    // In a real implementation, this would send to Kafka, RabbitMQ, etc.
    // For example with Kafka:
    // return this.kafkaProducer.send({
    //   topic: 'auth-events',
    //   messages: [{ key: event.type, value: JSON.stringify(event) }],
    // });

    return Promise.resolve(); // For now, we just simulate successful publishing
  }

  /**
   * Create the event payload with common metadata
   */
  private createEventPayload(
    type: string,
    data: Record<string, any>,
  ): BaseEvent {
    return {
      id: uuidv4(),
      type,
      timestamp: new Date(),
      version: this.serviceVersion,
      producer: this.serviceName,
      data,
    };
  }

  /**
   * Cleanup old processed entries
   * This is called by a scheduled job to remove old entries that have been processed
   */
  @Cron('0 0 * * * *') // Run once per hour
  async cleanupOutbox() {
    const retentionDays = this.configService.get(
      'events.outboxRetentionDays',
      7,
    );
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.outboxRepository.delete({
        processed: true,
        processedAt: { $lt: cutoffDate }, // TypeORM syntax for less than
      });

      if (result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} old outbox entries`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up outbox: ${error.message}`);
    }
  }
}
