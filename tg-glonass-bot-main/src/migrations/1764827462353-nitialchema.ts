// @ts-ignore
import type { MigrationInterface, QueryRunner } from "typeorm";

export class Nitialchema1764827462353 implements MigrationInterface {
    name = 'Nitialchema1764827462353'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "vk_id" character varying`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "post_to_wall" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "post_to_message" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TYPE "public"."posts_type_enum" RENAME TO "posts_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."posts_type_enum" AS ENUM('tg', 'mail', 'vk')`);
        await queryRunner.query(`ALTER TABLE "posts" ALTER COLUMN "type" TYPE "public"."posts_type_enum" USING "type"::"text"::"public"."posts_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."posts_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."posts_type_enum_old" AS ENUM('tg', 'mail')`);
        await queryRunner.query(`ALTER TABLE "posts" ALTER COLUMN "type" TYPE "public"."posts_type_enum_old" USING "type"::"text"::"public"."posts_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."posts_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."posts_type_enum_old" RENAME TO "posts_type_enum"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "post_to_message"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "post_to_wall"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "vk_id"`);
    }

}
