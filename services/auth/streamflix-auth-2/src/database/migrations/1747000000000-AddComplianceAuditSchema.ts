import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComplianceAuditSchema1747000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" character varying NOT NULL,
        "userId" uuid,
        "resourceType" character varying,
        "resourceId" character varying,
        "data" jsonb,
        "ipAddress" character varying,
        "userAgent" character varying,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for audit logs
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resourceType" ON "audit_logs" ("resourceType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resourceId" ON "audit_logs" ("resourceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_ipAddress" ON "audit_logs" ("ipAddress")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp")`,
    );

    // Create privacy consents table
    await queryRunner.query(`
      CREATE TABLE "privacy_consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "consentType" character varying NOT NULL,
        "version" character varying NOT NULL,
        "ipAddress" character varying,
        "userAgent" character varying,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_privacy_consents" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for privacy consents
    await queryRunner.query(
      `CREATE INDEX "IDX_privacy_consents_userId" ON "privacy_consents" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_privacy_consents_consentType" ON "privacy_consents" ("consentType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_privacy_consents_timestamp" ON "privacy_consents" ("timestamp")`,
    );

    // Create data exports table
    await queryRunner.query(`
      CREATE TABLE "data_exports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requestId" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "requestedBy" uuid NOT NULL,
        "format" character varying NOT NULL,
        "status" character varying NOT NULL,
        "filePath" character varying,
        "fileSize" integer,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_data_exports" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for data exports
    await queryRunner.query(
      `CREATE INDEX "IDX_data_exports_requestId" ON "data_exports" ("requestId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_exports_userId" ON "data_exports" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_exports_status" ON "data_exports" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_data_exports_expiresAt" ON "data_exports" ("expiresAt")`,
    );

    // Add externalId and isExternal columns to users table for LDAP/SAML integration
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "externalId" character varying,
      ADD COLUMN IF NOT EXISTS "isExternal" boolean DEFAULT false
    `);

    // Create index on externalId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_externalId" ON "users" ("externalId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "privacy_consents"`);
    await queryRunner.query(`DROP TABLE "data_exports"`);

    // Drop columns from users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "externalId",
      DROP COLUMN IF EXISTS "isExternal"
    `);
  }
}
