import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnterpriseFeatures1746500000000 implements MigrationInterface {
  name = 'EnterpriseFeatures1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Audit Logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "action" character varying NOT NULL,
        "entityType" character varying,
        "entityId" character varying,
        "ipAddress" character varying,
        "userAgent" character varying,
        "details" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Privacy Consent table
    await queryRunner.query(`
      CREATE TABLE "privacy_consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" character varying NOT NULL,
        "version" character varying NOT NULL,
        "consented" boolean NOT NULL DEFAULT false,
        "consentedAt" TIMESTAMP WITH TIME ZONE,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "ipAddress" character varying,
        "userAgent" character varying,
        "details" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_privacy_consents" PRIMARY KEY ("id")
      )
    `);

    // Data Export table for GDPR
    await queryRunner.query(`
      CREATE TABLE "data_exports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "fileUrl" character varying,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "format" character varying NOT NULL DEFAULT 'json',
        "requestReason" character varying,
        "adminId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_data_exports" PRIMARY KEY ("id")
      )
    `);

    // Add indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entityType" ON "audit_logs" ("entityType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_privacy_consents_userId" ON "privacy_consents" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_privacy_consents_type" ON "privacy_consents" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_privacy_consents_version" ON "privacy_consents" ("version")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_data_exports_userId" ON "data_exports" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_exports_status" ON "data_exports" ("status")`,
    );

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "FK_audit_logs_users" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "privacy_consents" 
      ADD CONSTRAINT "FK_privacy_consents_users" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "data_exports" 
      ADD CONSTRAINT "FK_data_exports_users" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "data_exports" 
      ADD CONSTRAINT "FK_data_exports_admin" 
      FOREIGN KEY ("adminId") REFERENCES "users"("id") 
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "data_exports" DROP CONSTRAINT "FK_data_exports_admin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_exports" DROP CONSTRAINT "FK_data_exports_users"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_consents" DROP CONSTRAINT "FK_privacy_consents_users"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_users"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_data_exports_status"`);
    await queryRunner.query(`DROP INDEX "IDX_data_exports_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_privacy_consents_version"`);
    await queryRunner.query(`DROP INDEX "IDX_privacy_consents_type"`);
    await queryRunner.query(`DROP INDEX "IDX_privacy_consents_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_entityType"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_userId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "data_exports"`);
    await queryRunner.query(`DROP TABLE "privacy_consents"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
