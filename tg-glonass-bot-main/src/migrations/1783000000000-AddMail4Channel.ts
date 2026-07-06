import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMail4Channel1783000000000 implements MigrationInterface {
    name = 'AddMail4Channel1783000000000'
    public transaction = false

    private async enumExists(queryRunner: QueryRunner, enumName: string): Promise<boolean> {
        const result: Array<{ exists: boolean }> = await queryRunner.query(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE n.nspname = 'public'
                      AND t.typname = $1
                ) AS "exists"
            `,
            [enumName],
        );

        return Boolean(result[0]?.exists);
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await this.enumExists(queryRunner, 'posts_type_enum')) {
            await queryRunner.query(`ALTER TYPE "public"."posts_type_enum" ADD VALUE IF NOT EXISTS 'mail4'`);
        }

        if (await this.enumExists(queryRunner, 'user_type_email_enum')) {
            await queryRunner.query(`ALTER TYPE "public"."user_type_email_enum" ADD VALUE IF NOT EXISTS 'mail4'`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        void queryRunner;
    }
}
