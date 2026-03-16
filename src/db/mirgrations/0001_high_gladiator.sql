ALTER TABLE "attendance" ALTER COLUMN "leave_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."leave_type";--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('sick', 'annual', 'special');--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "leave_type" SET DATA TYPE "public"."leave_type" USING "leave_type"::"public"."leave_type";--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "rest_days" jsonb DEFAULT '[0]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" DROP COLUMN "casual_leave_balance";