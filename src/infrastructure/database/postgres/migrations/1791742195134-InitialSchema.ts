import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791742195134 implements MigrationInterface {
    name = 'InitialSchema1791742195134'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "assignedReviewerId"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "businessType" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "ownerName" character varying(150) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "contactEmail" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "contactPhone" character varying(30)`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "created_by_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "assigned_reviewer_id" uuid`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "submittedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "reviewedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "businessName"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "businessName" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "legalBusinessName"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "legalBusinessName" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "estimatedMonthlyVolume" TYPE numeric(15,2)`);
        await queryRunner.query(`ALTER TYPE "public"."merchant_applications_status_enum" RENAME TO "merchant_applications_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."merchant_applications_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "status" TYPE "public"."merchant_applications_status_enum" USING "status"::"text"::"public"."merchant_applications_status_enum"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."merchant_applications_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."merchant_applications_riskstatus_enum" RENAME TO "merchant_applications_riskstatus_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."merchant_applications_riskstatus_enum" AS ENUM('NOT_STARTED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "riskStatus" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "riskStatus" TYPE "public"."merchant_applications_riskstatus_enum" USING "riskStatus"::"text"::"public"."merchant_applications_riskstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "riskStatus" SET DEFAULT 'NOT_STARTED'`);
        await queryRunner.query(`DROP TYPE "public"."merchant_applications_riskstatus_enum_old"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_05cab54cc74509eef3842c8975" ON "merchant_applications"  ("assigned_reviewer_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_1fad58ed7e6629cdbdc70175d4" ON "merchant_applications"  ("created_by_id", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1fad58ed7e6629cdbdc70175d4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05cab54cc74509eef3842c8975"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE TYPE "public"."merchant_applications_riskstatus_enum_old" AS ENUM('PENDING', 'PASSED', 'FAILED', 'MANUAL_REVIEW')`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "riskStatus" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "riskStatus" TYPE "public"."merchant_applications_riskstatus_enum_old" USING "riskStatus"::"text"::"public"."merchant_applications_riskstatus_enum_old"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "riskStatus" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."merchant_applications_riskstatus_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."merchant_applications_riskstatus_enum_old" RENAME TO "merchant_applications_riskstatus_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."merchant_applications_status_enum_old" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'INFO_REQUESTED')`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "status" TYPE "public"."merchant_applications_status_enum_old" USING "status"::"text"::"public"."merchant_applications_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."merchant_applications_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."merchant_applications_status_enum_old" RENAME TO "merchant_applications_status_enum"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ALTER COLUMN "estimatedMonthlyVolume" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "legalBusinessName"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "legalBusinessName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "businessName"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "businessName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "reviewedAt"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "submittedAt"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "assigned_reviewer_id"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "created_by_id"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "contactPhone"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "contactEmail"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "ownerName"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" DROP COLUMN "businessType"`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "assignedReviewerId" uuid`);
        await queryRunner.query(`ALTER TABLE "merchant_applications" ADD "createdById" character varying NOT NULL`);
    }

}
