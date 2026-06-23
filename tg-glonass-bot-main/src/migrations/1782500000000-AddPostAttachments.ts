import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostAttachments1782500000000 implements MigrationInterface {
    name = 'AddPostAttachments1782500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" ADD "attachments" text array NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "attachments"`);
    }
}