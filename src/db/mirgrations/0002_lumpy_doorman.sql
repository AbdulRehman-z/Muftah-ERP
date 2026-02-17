ALTER TABLE "employees" ADD COLUMN "bike_maintenance_allowance" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "mobile_allowance" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "fuel_allowance" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "special_allowance" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "incentive_percentage" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "bike_maintenance_allowance" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "mobile_allowance" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "fuel_allowance" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "special_allowance" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "incentive_amount" numeric(12, 2) DEFAULT '0';