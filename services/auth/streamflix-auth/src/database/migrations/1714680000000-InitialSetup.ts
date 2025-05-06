import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSetup1714680000000 implements MigrationInterface {
  name = 'InitialSetup1714680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create permissions table
    await queryRunner.query(`
            CREATE TABLE "permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "resource" character varying,
                "action" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_permissions_name" UNIQUE ("name"),
                CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
            )
        `);

    // Create roles table
    await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
                CONSTRAINT "PK_roles" PRIMARY KEY ("id")
            )
        `);

    // Create users table
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "password" character varying,
                "firstName" character varying,
                "lastName" character varying,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                "emailVerificationToken" character varying,
                "emailVerificationExpires" TIMESTAMP,
                "passwordResetToken" character varying,
                "passwordResetExpires" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "isLocked" boolean NOT NULL DEFAULT false,
                "lastLoginAt" TIMESTAMP,
                "lastLoginIp" character varying,
                "loginAttempts" integer NOT NULL DEFAULT 0,
                "lockUntil" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "googleId" character varying,
                "githubId" character varying,
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

    // Create role_permissions junction table
    await queryRunner.query(`
            CREATE TABLE "role_permissions" (
                "role_id" uuid NOT NULL,
                "permission_id" uuid NOT NULL,
                CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id")
            )
        `);

    // Create user_roles junction table
    await queryRunner.query(`
            CREATE TABLE "user_roles" (
                "user_id" uuid NOT NULL,
                "role_id" uuid NOT NULL,
                CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "role_permissions" 
            ADD CONSTRAINT "FK_role_permissions_role" 
            FOREIGN KEY ("role_id") REFERENCES "roles"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "role_permissions" 
            ADD CONSTRAINT "FK_role_permissions_permission" 
            FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "user_roles" 
            ADD CONSTRAINT "FK_user_roles_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "user_roles" 
            ADD CONSTRAINT "FK_user_roles_role" 
            FOREIGN KEY ("role_id") REFERENCES "roles"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // Create extension for UUID generation if it doesn't exist
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_permission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_role"`,
    );
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
