CREATE TYPE "public"."payment_mode" AS ENUM('fixed_cash', 'per_km');--> statement-breakpoint
CREATE TYPE "public"."shop_type" AS ENUM('old', 'new');--> statement-breakpoint
CREATE TABLE "bradford_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"payslip_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"computed_score" numeric(8, 2) NOT NULL,
	"override_score" numeric(8, 2) NOT NULL,
	"reason" text NOT NULL,
	"performed_by" text NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "night_shift_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"rate_per_night" numeric(10, 2) NOT NULL,
	"remarks" text,
	"set_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "night_shift_rates_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "tada_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"rate_per_km" numeric(8, 2) NOT NULL,
	"effective_from" date NOT NULL,
	"remarks" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"set_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"date" date NOT NULL,
	"destination" text NOT NULL,
	"round_trip_km" numeric(8, 2) NOT NULL,
	"rate_applied" numeric(8, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"purpose" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"paid_in_payslip_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "area_visited" text;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "payment_mode" "payment_mode" DEFAULT 'fixed_cash';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "is_company_vehicle" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "distance_km" numeric(8, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "per_km_rate" numeric(8, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "petrol_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "sale_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "recovery_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "return_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "slip_numbers" text;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "shop_type" "shop_type" DEFAULT 'old';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "is_order_booker" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "commission_rate" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "minimum_stock_level" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "bradford_audit_log" ADD CONSTRAINT "bradford_audit_log_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bradford_audit_log" ADD CONSTRAINT "bradford_audit_log_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bradford_audit_log" ADD CONSTRAINT "bradford_audit_log_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_shift_rates" ADD CONSTRAINT "night_shift_rates_set_by_user_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tada_rates" ADD CONSTRAINT "tada_rates_set_by_user_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_logs" ADD CONSTRAINT "travel_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_logs" ADD CONSTRAINT "travel_logs_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_logs" ADD CONSTRAINT "travel_logs_paid_in_payslip_id_payslips_id_fk" FOREIGN KEY ("paid_in_payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;