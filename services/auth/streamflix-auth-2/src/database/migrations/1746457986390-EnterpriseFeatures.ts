import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class EnterpriseFeatures1746457986390 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Audit Log Table
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'event',
            type: 'varchar',
          },
          {
            name: 'resourceType',
            type: 'varchar',
          },
          {
            name: 'resourceId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'region',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create Privacy Consent Table
    await queryRunner.createTable(
      new Table({
        name: 'privacy_consents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'consentType',
            type: 'varchar',
          },
          {
            name: 'consentVersion',
            type: 'varchar',
          },
          {
            name: 'consented',
            type: 'boolean',
            default: false,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create Data Export Table
    await queryRunner.createTable(
      new Table({
        name: 'data_exports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'format',
            type: 'varchar',
            default: "'json'",
          },
          {
            name: 'filePath',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'requestedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'downloadCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create SAML Provider Table
    await queryRunner.createTable(
      new Table({
        name: 'saml_providers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'displayName',
            type: 'varchar',
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'entryPoint',
            type: 'varchar',
          },
          {
            name: 'issuer',
            type: 'varchar',
          },
          {
            name: 'cert',
            type: 'text',
          },
          {
            name: 'privateKey',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'privateCert',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attributeMapping',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'groupAttributeName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'groupMapping',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create LDAP Directory Table
    await queryRunner.createTable(
      new Table({
        name: 'ldap_directories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'url',
            type: 'varchar',
          },
          {
            name: 'baseDN',
            type: 'varchar',
          },
          {
            name: 'bindDN',
            type: 'varchar',
          },
          {
            name: 'bindCredentials',
            type: 'varchar',
          },
          {
            name: 'searchBase',
            type: 'varchar',
          },
          {
            name: 'searchFilter',
            type: 'varchar',
          },
          {
            name: 'groupSearchBase',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'groupSearchFilter',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAttributeMap',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'groupMappings',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create Foreign Keys
    await queryRunner.createForeignKey(
      'privacy_consents',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'data_exports',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add index for audit logs for faster querying
    await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("userId");
            CREATE INDEX "IDX_audit_logs_event" ON "audit_logs" ("event");
            CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("createdAt");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to avoid FK constraint issues
    await queryRunner.dropTable('ldap_directories', true);
    await queryRunner.dropTable('saml_providers', true);
    await queryRunner.dropTable('data_exports', true);
    await queryRunner.dropTable('privacy_consents', true);
    await queryRunner.dropTable('audit_logs', true);
  }
}
