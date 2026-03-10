ALTER TABLE "attendance" ALTER COLUMN "payment_mode" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "payment_mode" SET DEFAULT 'per_km'::text;--> statement-breakpoint
DROP TYPE "public"."payment_mode";--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('per_km');--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "payment_mode" SET DEFAULT 'per_km'::"public"."payment_mode";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "payment_mode" SET DATA TYPE "public"."payment_mode" USING "payment_mode"::"public"."payment_mode";