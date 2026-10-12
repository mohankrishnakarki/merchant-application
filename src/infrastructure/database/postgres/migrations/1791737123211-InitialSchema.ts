import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791737123211 implements MigrationInterface {
    name = 'InitialSchema1791737123211'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."merchant_applications_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'INFO_REQUESTED')`);
        await queryRunner.query(`CREATE TYPE "public"."merchant_applications_riskstatus_enum" AS ENUM('PENDING', 'PASSED', 'FAILED', 'MANUAL_REVIEW')`);
        await queryRunner.query(`CREATE TABLE "merchant_applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessName" character varying NOT NULL, "legalBusinessName" character varying NOT NULL, "estimatedMonthlyVolume" numeric NOT NULL, "status" "public"."merchant_applications_status_enum" NOT NULL DEFAULT 'DRAFT', "riskStatus" "public"."merchant_applications_riskstatus_enum" NOT NULL DEFAULT 'PENDING', "createdById" character varying NOT NULL, "assignedReviewerId" uuid, "version" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_09b9df0877db73b8a232c8c7ed4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'REVIEWER', 'SALES')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'SALES', "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "merchant_applications"`);
        await queryRunner.query(`DROP TYPE "public"."merchant_applications_riskstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."merchant_applications_status_enum"`);
    }

}
