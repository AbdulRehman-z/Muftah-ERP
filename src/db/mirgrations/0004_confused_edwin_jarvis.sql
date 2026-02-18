ALTER TABLE "payroll_runs" RENAME TO "payrolls";--> statement-breakpoint
ALTER TABLE "payslips" RENAME COLUMN "payroll_run_id" TO "payroll_id";--> statement-breakpoint
ALTER TABLE "payrolls" DROP CONSTRAINT "payroll_runs_processed_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "payslips" DROP CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_processed_by_user_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_id_payrolls_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payrolls"("id") ON DELETE no action ON UPDATE no action;