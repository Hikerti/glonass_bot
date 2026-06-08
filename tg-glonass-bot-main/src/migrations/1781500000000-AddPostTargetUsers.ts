import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostTargetUsers1781500000000 implements MigrationInterface {
    name = 'AddPostTargetUsers1781500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" ADD "target_user_ids" uuid array NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "target_user_ids"`);
    }
}
