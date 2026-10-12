import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791742357828 implements MigrationInterface {
    name = 'InitialSchema1791742357828'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."merchant_applications_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TYPE "public"."merchant_applications_riskstatus_enum" AS ENUM('NOT_STARTED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "merchant_applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessName" character varying(200) NOT NULL, "legalBusinessName" character varying(200) NOT NULL, "businessType" character varying(100) NOT NULL, "ownerName" character varying(150) NOT NULL, "contactEmail" character varying(255) NOT NULL, "contactPhone" character varying(30), "estimatedMonthlyVolume" numeric(15,2) NOT NULL, "status" "public"."merchant_applications_status_enum" NOT NULL DEFAULT 'DRAFT', "riskStatus" "public"."merchant_applications_riskstatus_enum" NOT NULL DEFAULT 'NOT_STARTED', "created_by_id" uuid NOT NULL, "assigned_reviewer_id" uuid, "version" integer NOT NULL, "submittedAt" TIMESTAMP WITH TIME ZONE, "reviewedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_09b9df0877db73b8a232c8c7ed4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_05cab54cc74509eef3842c8975" ON "merchant_applications"  ("assigned_reviewer_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_1fad58ed7e6629cdbdc70175d4" ON "merchant_applications"  ("created_by_id", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'REVIEWER', 'SALES')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'SALES', "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1fad58ed7e6629cdbdc70175d4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05cab54cc74509eef3842c8975"`);
        await queryRunner.query(`DROP TABLE "merchant_applications"`);
        await queryRunner.query(`DROP TYPE "public"."merchant_applications_riskstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."merchant_applications_status_enum"`);
    }

}
