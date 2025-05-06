import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1714565998951 implements MigrationInterface {
  name = 'InitialSchema1714565998951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for user roles
    await queryRunner.query(`
      CREATE TYPE "public"."user_role_enum" AS ENUM (
        'user', 
        'admin', 
        'content_manager',
        'customer_support'
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "email" character varying NOT NULL,
        "first_name" character varying,
        "last_name" character varying,
        "password" character varying NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'user',
        "email_verified" boolean NOT NULL DEFAULT false,
        "email_verification_token" character varying,
        "password_reset_token" character varying,
        "password_reset_expires" TIMESTAMP,
        "refresh_token" character varying,
        "mfa_enabled" boolean NOT NULL DEFAULT false,
        "mfa_secret" character varying,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "lock_until" TIMESTAMP,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login" TIMESTAMP,
        "provider" character varying,
        "provider_id" character varying,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_users_email" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_provider_provider_id" ON "users" ("provider", "provider_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "public"."IDX_users_provider_provider_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}
