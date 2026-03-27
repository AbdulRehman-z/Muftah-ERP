ALTER TABLE "payslips" ADD COLUMN "arrears_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "arrears_from_months" jsonb DEFAULT '[]'::jsonb;