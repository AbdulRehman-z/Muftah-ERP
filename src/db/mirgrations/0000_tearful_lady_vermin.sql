CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'leave', 'holiday');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'on_leave', 'terminated', 'resigned', 'pending_deletion');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'intern');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('sick', 'annual', 'special');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('per_km');--> statement-breakpoint
CREATE TYPE "public"."shop_type" AS ENUM('old', 'new');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_name" text NOT NULL,
	"supplier_shop_name" text,
	"email" text,
	"phone" text,
	"national_id" text,
	"address" text,
	"city" text,
	"state" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"category_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"wallet_id" text NOT NULL,
	"performed_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"source" text NOT NULL,
	"reference_id" text,
	"performed_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advance_installments" (
	"id" text PRIMARY KEY NOT NULL,
	"advance_id" text NOT NULL,
	"payslip_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"installment_no" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"overtime_status" text DEFAULT 'pending',
	"overtime_remarks" text,
	"early_departure_status" text DEFAULT 'none',
	"check_out_reason" text,
	"is_approved_leave" boolean DEFAULT false,
	"leave_approval_status" text DEFAULT 'none',
	"leave_type" "leave_type",
	"entry_source" text DEFAULT 'manual',
	"area_visited" text,
	"payment_mode" "payment_mode" DEFAULT 'per_km',
	"is_company_vehicle" boolean DEFAULT false,
	"distance_km" numeric(8, 2) DEFAULT '0',
	"per_km_rate" numeric(8, 2) DEFAULT '0',
	"petrol_amount" numeric(12, 2) DEFAULT '0',
	"sale_amount" numeric(12, 2) DEFAULT '0',
	"recovery_amount" numeric(12, 2) DEFAULT '0',
	"return_amount" numeric(12, 2) DEFAULT '0',
	"slip_numbers" text,
	"shop_type" "shop_type" DEFAULT 'old',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"bank_name" text,
	"bank_account_number" text,
	"standard_duty_hours" integer DEFAULT 8 NOT NULL,
	"standard_salary" numeric(12, 2) DEFAULT '0',
	"rest_days" jsonb DEFAULT '[0]'::jsonb NOT NULL,
	"allowance_config" jsonb DEFAULT '[{"id":"houseRent","name":"House Rent","amount":0,"deductions":{"absent":true,"annualLeave":false,"sickLeave":false,"specialLeave":true,"lateArrival":false,"earlyLeaving":false}},{"id":"utilities","name":"Utilities","amount":0,"deductions":{"absent":true,"annualLeave":false,"sickLeave":false,"specialLeave":true,"lateArrival":false,"earlyLeaving":false}},{"id":"conveyance","name":"Conveyance Allowance","amount":0,"deductions":{"absent":true,"annualLeave":true,"sickLeave":false,"specialLeave":true,"lateArrival":false,"earlyLeaving":false}},{"id":"fuel","name":"Fuel Allowance","amount":0,"deductions":{"absent":true,"annualLeave":true,"sickLeave":false,"specialLeave":true,"lateArrival":false,"earlyLeaving":false}},{"id":"mobile","name":"Mobile Allowance","amount":0,"deductions":{"absent":true,"annualLeave":false,"sickLeave":false,"specialLeave":true,"lateArrival":false,"earlyLeaving":false}},{"id":"bikeMaintenance","name":"Bike Maintenance","amount":0,"deductions":{"absent":true,"annualLeave":false,"sickLeave":false,"specialLeave":true,"lateArrival":false,"earlyLeaving":false}},{"id":"technical","name":"Technical Allowance","amount":0,"deductions":{"absent":true,"annualLeave":false,"sickLeave":false,"specialLeave":false,"lateArrival":false,"earlyLeaving":false}},{"id":"special","name":"Special Allowance","amount":0,"deductions":{"absent":false,"annualLeave":false,"sickLeave":false,"specialLeave":false,"lateArrival":false,"earlyLeaving":false}},{"id":"nightShift","name":"Night Shift Allowance","amount":0,"deductions":{"absent":false,"annualLeave":false,"sickLeave":false,"specialLeave":false,"lateArrival":false,"earlyLeaving":false}}]'::jsonb,
	"annual_leave_balance" integer DEFAULT 14,
	"annual_leave_allowance" integer DEFAULT 14,
	"leave_year_start" date,
	"sick_leave_balance" integer DEFAULT 10,
	"is_order_booker" boolean DEFAULT false NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
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
CREATE TABLE "payrolls" (
	"id" text PRIMARY KEY NOT NULL,
	"month" date NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'draft',
	"total_amount" numeric(15, 2) DEFAULT '0',
	"processed_by" text,
	"wallet_id" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" text PRIMARY KEY NOT NULL,
	"payroll_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"days_present" integer DEFAULT 0,
	"days_absent" integer DEFAULT 0,
	"days_leave" integer DEFAULT 0,
	"total_overtime_hours" numeric(8, 2) DEFAULT '0',
	"night_shifts_count" integer DEFAULT 0,
	"basic_salary" numeric(12, 2) NOT NULL,
	"allowance_breakdown" jsonb DEFAULT '{}'::jsonb,
	"incentive_amount" numeric(12, 2) DEFAULT '0',
	"overtime_amount" numeric(12, 2) DEFAULT '0',
	"night_shift_allowance_amount" numeric(12, 2) DEFAULT '0',
	"bonus_amount" numeric(12, 2) DEFAULT '0',
	"absent_deduction" numeric(12, 2) DEFAULT '0',
	"leave_deduction" numeric(12, 2) DEFAULT '0',
	"advance_deduction" numeric(12, 2) DEFAULT '0',
	"tax_deduction" numeric(12, 2) DEFAULT '0',
	"other_deduction" numeric(12, 2) DEFAULT '0',
	"bradford_factor_score" numeric(8, 2) DEFAULT '0',
	"bradford_factor_override" numeric(8, 2),
	"bradford_factor_period" text,
	"yearly_bradford_score" numeric(8, 2) DEFAULT '0',
	"gross_salary" numeric(12, 2) NOT NULL,
	"total_deductions" numeric(12, 2) NOT NULL,
	"net_salary" numeric(12, 2) NOT NULL,
	"arrears_amount" numeric(12, 2) DEFAULT '0',
	"arrears_from_months" jsonb DEFAULT '[]'::jsonb,
	"payment_source" text,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_advances" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"wallet_id" text,
	"paid_at" timestamp,
	"deducted_in_payslip_id" text,
	"installment_months" integer DEFAULT 1 NOT NULL,
	"installment_amount" numeric(12, 2),
	"installments_paid" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "chemical_lab_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"chemical_id" text NOT NULL,
	"product_name" text NOT NULL,
	"stock_number" text,
	"lot_number" text,
	"analysis_items" jsonb NOT NULL,
	"certified_by" text NOT NULL,
	"certifier_title" text,
	"report_date" timestamp NOT NULL,
	"standard_reference" text,
	"notes" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chemicals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"cost_per_unit" numeric(10, 2) DEFAULT '0',
	"minimum_stock_level" numeric(10, 2) DEFAULT '0',
	"packaging_type" text,
	"packaging_size" text,
	"last_supplier_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finished_goods_stock" (
	"id" text PRIMARY KEY NOT NULL,
	"warehouse_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"quantity_cartons" integer DEFAULT 0 NOT NULL,
	"quantity_containers" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"warehouse_id" text NOT NULL,
	"material_type" text NOT NULL,
	"material_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 3) NOT NULL,
	"reason" text NOT NULL,
	"performed_by_id" text NOT NULL,
	"reference_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_stock" (
	"id" text PRIMARY KEY NOT NULL,
	"warehouse_id" text NOT NULL,
	"chemical_id" text,
	"packaging_material_id" text,
	"quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packaging_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'primary' NOT NULL,
	"capacity" numeric(10, 2),
	"capacity_unit" text,
	"weight_per_pack" numeric(10, 3),
	"price_per_kg" numeric(10, 2),
	"associated_sticker_id" text,
	"sticker_cost" numeric(10, 2) DEFAULT '0',
	"cost_per_unit" numeric(10, 2) DEFAULT '0',
	"minimum_stock_level" integer DEFAULT 0,
	"last_supplier_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_materials_used" (
	"id" text PRIMARY KEY NOT NULL,
	"production_run_id" text NOT NULL,
	"material_type" text NOT NULL,
	"material_id" text NOT NULL,
	"quantity_used" numeric(12, 3) NOT NULL,
	"cost_per_unit" numeric(10, 2) NOT NULL,
	"total_cost" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"operator_id" text NOT NULL,
	"batches_produced" integer NOT NULL,
	"cartons_produced" integer DEFAULT 0,
	"containers_produced" integer NOT NULL,
	"completed_units" integer DEFAULT 0,
	"loose_units_produced" integer DEFAULT 0,
	"total_chemical_cost" numeric(12, 2) DEFAULT '0',
	"total_packaging_cost" numeric(12, 2) DEFAULT '0',
	"total_production_cost" numeric(12, 2) DEFAULT '0',
	"cost_per_container" numeric(10, 4) DEFAULT '0',
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_start_date" timestamp,
	"actual_start_date" timestamp,
	"actual_completion_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_runs_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"chemical_id" text NOT NULL,
	"quantity_per_batch" numeric(10, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_packaging" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"packaging_material_id" text NOT NULL,
	"quantity_per_container" numeric(10, 6) NOT NULL,
	"is_optional" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"batch_size" numeric(10, 2) NOT NULL,
	"batch_unit" text DEFAULT 'liters' NOT NULL,
	"target_units_per_batch" integer DEFAULT 0 NOT NULL,
	"container_type" text NOT NULL,
	"container_packaging_id" text NOT NULL,
	"fill_amount" numeric(10, 3),
	"fill_unit" text,
	"containers_per_carton" integer DEFAULT 0,
	"carton_packaging_id" text,
	"estimated_cost_per_batch" numeric(12, 2),
	"estimated_cost_per_container" numeric(10, 4),
	"estimated_ingredients_cost" numeric(12, 2),
	"estimated_packaging_cost" numeric(12, 2),
	"min_batch_yield" numeric(5, 2),
	"target_shelf_life" integer,
	"minimum_stock_level" integer DEFAULT 0,
	"notes" text,
	"production_instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"from_warehouse_id" text NOT NULL,
	"to_warehouse_id" text NOT NULL,
	"material_type" text NOT NULL,
	"material_id" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"performed_by_id" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"type" text DEFAULT 'storage' NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"module_key" text NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'action' NOT NULL,
	"route_pattern" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "app_role_permissions" (
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_role_permissions_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "app_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"default_landing_path" text DEFAULT '/dashboard' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_role_assignments" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"assigned_by_user_id" text,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"s_no" serial NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"cnic" text,
	"city" text,
	"state" text,
	"bank_account" text,
	"mobile_number" text,
	"total_sale" numeric(12, 2) DEFAULT '0',
	"payment" numeric(12, 2) DEFAULT '0',
	"credit" numeric(12, 2) DEFAULT '0',
	"weight_sale_kg" numeric(12, 3) DEFAULT '0',
	"expenses" numeric(12, 2) DEFAULT '0',
	"average_per_kg" numeric(12, 2) DEFAULT '0',
	"average_kg_with_expense" numeric(12, 2) DEFAULT '0',
	"expense_average" numeric(12, 2) DEFAULT '0',
	"customer_type" text DEFAULT 'retailer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"pack" text NOT NULL,
	"recipe_id" text,
	"number_of_cartons" integer DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"total_weight" numeric(12, 3) DEFAULT '0' NOT NULL,
	"per_carton_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_cartons" integer DEFAULT 0 NOT NULL,
	"hsn_code" text NOT NULL,
	"retail_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"margin" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"s_no" serial NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"customer_id" text NOT NULL,
	"account" text,
	"cash" numeric(12, 2) DEFAULT '0',
	"credit" numeric(12, 2) DEFAULT '0',
	"credit_return_date" timestamp,
	"expenses" numeric(12, 2) DEFAULT '0',
	"expenses_description" text,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"slip_number" text,
	"remarks" text,
	"warehouse_id" text NOT NULL,
	"performed_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_records" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"material_type" text NOT NULL,
	"chemical_id" text,
	"packaging_material_id" text,
	"quantity" numeric(12, 3) NOT NULL,
	"cost" numeric(12, 2) NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"purchase_date" timestamp DEFAULT now() NOT NULL,
	"invoice_number" text,
	"payment_method" text,
	"bank_name" text,
	"transaction_id" text,
	"paid_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"reference" text,
	"method" text,
	"bank_name" text,
	"paid_by" text,
	"notes" text,
	"purchase_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advance_installments" ADD CONSTRAINT "advance_installments_advance_id_salary_advances_id_fk" FOREIGN KEY ("advance_id") REFERENCES "public"."salary_advances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advance_installments" ADD CONSTRAINT "advance_installments_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bradford_audit_log" ADD CONSTRAINT "bradford_audit_log_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bradford_audit_log" ADD CONSTRAINT "bradford_audit_log_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bradford_audit_log" ADD CONSTRAINT "bradford_audit_log_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_shift_rates" ADD CONSTRAINT "night_shift_rates_set_by_user_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_processed_by_user_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_id_payrolls_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payrolls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_deducted_in_payslip_id_payslips_id_fk" FOREIGN KEY ("deducted_in_payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tada_rates" ADD CONSTRAINT "tada_rates_set_by_user_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_logs" ADD CONSTRAINT "travel_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_logs" ADD CONSTRAINT "travel_logs_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_logs" ADD CONSTRAINT "travel_logs_paid_in_payslip_id_payslips_id_fk" FOREIGN KEY ("paid_in_payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chemical_lab_reports" ADD CONSTRAINT "chemical_lab_reports_chemical_id_chemicals_id_fk" FOREIGN KEY ("chemical_id") REFERENCES "public"."chemicals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chemical_lab_reports" ADD CONSTRAINT "chemical_lab_reports_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chemicals" ADD CONSTRAINT "chemicals_last_supplier_id_suppliers_id_fk" FOREIGN KEY ("last_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods_stock" ADD CONSTRAINT "finished_goods_stock_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods_stock" ADD CONSTRAINT "finished_goods_stock_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audit_log" ADD CONSTRAINT "inventory_audit_log_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audit_log" ADD CONSTRAINT "inventory_audit_log_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_stock" ADD CONSTRAINT "material_stock_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_stock" ADD CONSTRAINT "material_stock_chemical_id_chemicals_id_fk" FOREIGN KEY ("chemical_id") REFERENCES "public"."chemicals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_stock" ADD CONSTRAINT "material_stock_packaging_material_id_packaging_materials_id_fk" FOREIGN KEY ("packaging_material_id") REFERENCES "public"."packaging_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packaging_materials" ADD CONSTRAINT "packaging_materials_associated_sticker_id_packaging_materials_id_fk" FOREIGN KEY ("associated_sticker_id") REFERENCES "public"."packaging_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packaging_materials" ADD CONSTRAINT "packaging_materials_last_supplier_id_suppliers_id_fk" FOREIGN KEY ("last_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_materials_used" ADD CONSTRAINT "production_materials_used_production_run_id_production_runs_id_fk" FOREIGN KEY ("production_run_id") REFERENCES "public"."production_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_operator_id_user_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_chemical_id_chemicals_id_fk" FOREIGN KEY ("chemical_id") REFERENCES "public"."chemicals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_packaging" ADD CONSTRAINT "recipe_packaging_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_packaging" ADD CONSTRAINT "recipe_packaging_packaging_material_id_packaging_materials_id_fk" FOREIGN KEY ("packaging_material_id") REFERENCES "public"."packaging_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_container_packaging_id_packaging_materials_id_fk" FOREIGN KEY ("container_packaging_id") REFERENCES "public"."packaging_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_carton_packaging_id_packaging_materials_id_fk" FOREIGN KEY ("carton_packaging_id") REFERENCES "public"."packaging_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_role_permissions" ADD CONSTRAINT "app_role_permissions_role_id_app_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_role_permissions" ADD CONSTRAINT "app_role_permissions_permission_id_app_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."app_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_app_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_user_id_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_records" ADD CONSTRAINT "purchase_records_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_records" ADD CONSTRAINT "purchase_records_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_records" ADD CONSTRAINT "purchase_records_chemical_id_chemicals_id_fk" FOREIGN KEY ("chemical_id") REFERENCES "public"."chemicals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_records" ADD CONSTRAINT "purchase_records_packaging_material_id_packaging_materials_id_fk" FOREIGN KEY ("packaging_material_id") REFERENCES "public"."packaging_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_purchase_id_purchase_records_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchase_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "attendance_employee_date_idx" ON "attendance" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "lab_report_chemical_idx" ON "chemical_lab_reports" USING btree ("chemical_id");--> statement-breakpoint
CREATE INDEX "lab_report_date_idx" ON "chemical_lab_reports" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "fg_warehouse_recipe_idx" ON "finished_goods_stock" USING btree ("warehouse_id","recipe_id");--> statement-breakpoint
CREATE INDEX "audit_warehouse_idx" ON "inventory_audit_log" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "audit_date_idx" ON "inventory_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_warehouse_idx" ON "material_stock" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "production_runs_updated_at_idx" ON "production_runs" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "ingredients_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "packaging_recipe_idx" ON "recipe_packaging" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "app_permissions_key_idx" ON "app_permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "app_permissions_module_idx" ON "app_permissions" USING btree ("module_key");--> statement-breakpoint
CREATE INDEX "app_role_permissions_role_idx" ON "app_role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "app_role_permissions_permission_idx" ON "app_role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "app_roles_slug_idx" ON "app_roles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "app_roles_archived_idx" ON "app_roles" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_role_assignments_assigned_by_idx" ON "user_role_assignments" USING btree ("assigned_by_user_id");--> statement-breakpoint
CREATE INDEX "purchase_supplier_idx" ON "purchase_records" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_warehouse_idx" ON "purchase_records" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "purchase_date_idx" ON "purchase_records" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "payment_supplier_idx" ON "supplier_payments" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "payment_purchase_idx" ON "supplier_payments" USING btree ("purchase_id");