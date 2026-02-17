CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'leave', 'half_day', 'holiday');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'on_leave', 'terminated', 'resigned');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'intern');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('sick', 'casual', 'annual', 'unpaid');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"date" date NOT NULL,
	"check_in" time,
	"check_out" time,
	"check_in_2" time,
	"check_out_2" time,
	"duty_hours" numeric(5, 2) DEFAULT '0',
	"overtime_hours" numeric(5, 2) DEFAULT '0',
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"is_late" boolean DEFAULT false,
	"is_night_shift" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"cnic" text,
	"phone" text,
	"address" text,
	"designation" text NOT NULL,
	"department" text,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"joining_date" date NOT NULL,
	"basic_salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"house_rent_allowance" numeric(12, 2) DEFAULT '0',
	"utilities_allowance" numeric(12, 2) DEFAULT '0',
	"conveyance_allowance" numeric(12, 2) DEFAULT '0',
	"standard_duty_hours" integer DEFAULT 8 NOT NULL,
	"is_operator" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"month" date NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'draft',
	"total_amount" numeric(15, 2) DEFAULT '0',
	"processed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" text PRIMARY KEY NOT NULL,
	"payroll_run_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"days_present" integer DEFAULT 0,
	"days_absent" integer DEFAULT 0,
	"days_leave" integer DEFAULT 0,
	"total_overtime_hours" numeric(8, 2) DEFAULT '0',
	"night_shifts_count" integer DEFAULT 0,
	"basic_salary" numeric(12, 2) NOT NULL,
	"house_rent_allowance" numeric(12, 2) DEFAULT '0',
	"utilities_allowance" numeric(12, 2) DEFAULT '0',
	"conveyance_allowance" numeric(12, 2) DEFAULT '0',
	"overtime_amount" numeric(12, 2) DEFAULT '0',
	"night_shift_allowance_amount" numeric(12, 2) DEFAULT '0',
	"bonus_amount" numeric(12, 2) DEFAULT '0',
	"absent_deduction" numeric(12, 2) DEFAULT '0',
	"advance_deduction" numeric(12, 2) DEFAULT '0',
	"tax_deduction" numeric(12, 2) DEFAULT '0',
	"other_deduction" numeric(12, 2) DEFAULT '0',
	"gross_salary" numeric(12, 2) NOT NULL,
	"total_deductions" numeric(12, 2) NOT NULL,
	"net_salary" numeric(12, 2) NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_processed_by_user_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_employee_date_idx" ON "attendance" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "production_runs_updated_at_idx" ON "production_runs" USING btree ("updated_at");