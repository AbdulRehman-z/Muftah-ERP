ALTER TABLE "employees" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "bank_account_number" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "standard_salary" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "annual_leave_balance" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "sick_leave_balance" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "casual_leave_balance" integer DEFAULT 5;