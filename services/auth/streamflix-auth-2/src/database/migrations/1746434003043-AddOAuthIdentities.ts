import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthIdentities1746434003043 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add avatarUrl column to users table
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "avatarUrl" character varying;
        `);

    // Remove old OAuth fields from users table since we'll use a separate table
    await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN IF EXISTS "provider",
            DROP COLUMN IF EXISTS "providerId";
        `);

    // Create oauth_identities table
    await queryRunner.query(`
            CREATE TABLE "oauth_identities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "provider" character varying NOT NULL,
                "provider_id" character varying NOT NULL,
                "email" character varying,
                "name" character varying,
                "firstName" character varying,
                "lastName" character varying,
                "avatarUrl" character varying,
                "rawProfile" jsonb,
                "accessToken" character varying,
                "refreshToken" character varying,
                "tokenExpiresAt" TIMESTAMP,
                "active" boolean NOT NULL DEFAULT true,
                "lastLogin" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "pk_oauth_identities" PRIMARY KEY ("id")
            );
        `);

    // Create indexes
    await queryRunner.query(`
            CREATE INDEX "idx_oauth_identities_user_id" ON "oauth_identities" ("user_id");
            CREATE INDEX "idx_oauth_identities_provider" ON "oauth_identities" ("provider");
            CREATE INDEX "idx_oauth_identities_provider_id" ON "oauth_identities" ("provider_id");
            CREATE UNIQUE INDEX "idx_oauth_identities_provider_provider_id" ON "oauth_identities" ("provider", "provider_id");
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "oauth_identities"
            ADD CONSTRAINT "fk_oauth_identities_user_id"
            FOREIGN KEY ("user_id")
            REFERENCES "users"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "oauth_identities"
            DROP CONSTRAINT "fk_oauth_identities_user_id";
        `);

    // Drop indexes
    await queryRunner.query(`
            DROP INDEX "idx_oauth_identities_user_id";
            DROP INDEX "idx_oauth_identities_provider";
            DROP INDEX "idx_oauth_identities_provider_id";
            DROP INDEX "idx_oauth_identities_provider_provider_id";
        `);

    // Drop oauth_identities table
    await queryRunner.query(`
            DROP TABLE "oauth_identities";
        `);

    // Add back the old OAuth fields to users table
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "provider" character varying,
            ADD COLUMN "providerId" character varying;
        `);

    // Drop avatarUrl column from users table
    await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "avatarUrl";
        `);
  }
}
