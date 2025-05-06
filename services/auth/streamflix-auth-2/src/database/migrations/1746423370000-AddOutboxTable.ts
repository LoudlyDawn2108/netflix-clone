import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddOutboxTable1746423370000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'outbox',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'processed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'processed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'error',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indices for better performance
    await queryRunner.createIndex(
      'outbox',
      new TableIndex({
        name: 'IDX_OUTBOX_PROCESSED',
        columnNames: ['processed'],
      }),
    );

    await queryRunner.createIndex(
      'outbox',
      new TableIndex({
        name: 'IDX_OUTBOX_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'outbox',
      new TableIndex({
        name: 'IDX_OUTBOX_TYPE',
        columnNames: ['type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('outbox', 'IDX_OUTBOX_PROCESSED');
    await queryRunner.dropIndex('outbox', 'IDX_OUTBOX_CREATED_AT');
    await queryRunner.dropIndex('outbox', 'IDX_OUTBOX_TYPE');
    await queryRunner.dropTable('outbox');
  }
}
