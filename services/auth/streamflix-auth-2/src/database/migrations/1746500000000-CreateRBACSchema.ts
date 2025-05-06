import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRBACSchema1746500000000 implements MigrationInterface {
  name = 'CreateRBACSchema1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create permissions table
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying NOT NULL,
        "resource" character varying,
        "action" character varying,
        "isSystem" boolean NOT NULL DEFAULT false,
        "scope" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_permissions_name" UNIQUE ("name"),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      )
    `);

    // Add index on permissions.name
    await queryRunner.query(`
      CREATE INDEX "IDX_permissions_name" ON "permissions" ("name")
    `);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying NOT NULL,
        "isSystem" boolean NOT NULL DEFAULT false,
        "parentId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    // Add index on roles.name
    await queryRunner.query(`
      CREATE INDEX "IDX_roles_name" ON "roles" ("name")
    `);

    // Add index on roles.parentId
    await queryRunner.query(`
      CREATE INDEX "IDX_roles_parentId" ON "roles" ("parentId")
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
      ALTER TABLE "roles" 
      ADD CONSTRAINT "FK_roles_parent" 
      FOREIGN KEY ("parentId") 
      REFERENCES "roles" ("id") 
      ON DELETE SET NULL 
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permissions" 
      ADD CONSTRAINT "FK_role_permissions_role" 
      FOREIGN KEY ("role_id") 
      REFERENCES "roles" ("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permissions" 
      ADD CONSTRAINT "FK_role_permissions_permission" 
      FOREIGN KEY ("permission_id") 
      REFERENCES "permissions" ("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_roles" 
      ADD CONSTRAINT "FK_user_roles_user" 
      FOREIGN KEY ("user_id") 
      REFERENCES "users" ("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_roles" 
      ADD CONSTRAINT "FK_user_roles_role" 
      FOREIGN KEY ("role_id") 
      REFERENCES "roles" ("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
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
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_parent"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP INDEX "IDX_roles_parentId"`);
    await queryRunner.query(`DROP INDEX "IDX_roles_name"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP INDEX "IDX_permissions_name"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
