import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordHistoryFields1746400279067 implements MigrationInterface {
  name = 'PasswordHistoryFields1746400279067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add lastPasswordChange column
    await queryRunner.query(`
            ALTER TABLE "users" ADD "last_password_change" TIMESTAMP
        `);

    // Add passwordHistory column as text array
    await queryRunner.query(`
            ALTER TABLE "users" ADD "password_history" text[]
        `);

    // Create index on lastPasswordChange for faster queries on password expiry
    await queryRunner.query(`
            CREATE INDEX "IDX_users_last_password_change" ON "users" ("last_password_change")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
            DROP INDEX "IDX_users_last_password_change"
        `);

    // Drop the columns
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "password_history"
        `);

    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "last_password_change"
        `);
  }
}
