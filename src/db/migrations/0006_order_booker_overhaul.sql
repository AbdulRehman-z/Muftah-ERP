ALTER TABLE "attendance" DROP COLUMN IF EXISTS "area_visited";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "payment_mode";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "is_company_vehicle";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "distance_km";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "per_km_rate";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "petrol_amount";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "sale_amount";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "recovery_amount";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "return_amount";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "slip_numbers";--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "shop_type";--> statement-breakpoint
DROP TYPE IF EXISTS "payment_mode";--> statement-breakpoint
DROP TYPE IF EXISTS "shop_type";--> statement-breakpoint
ALTER TABLE "order_bookers" DROP COLUMN IF EXISTS "vehicle_type";--> statement-breakpoint
ALTER TABLE "order_bookers" DROP COLUMN IF EXISTS "is_company_vehicle";--> statement-breakpoint
ALTER TABLE "order_bookers" DROP COLUMN IF EXISTS "fuel_cost_per_trip";--> statement-breakpoint
ALTER TABLE "order_bookers" ADD COLUMN IF NOT EXISTS "assigned_area" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trip_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfilled_by_salesman_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfilled_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfilled_amount" numeric(12, 2);--> statement-breakpoint
CREATE TABLE "order_booker_trips" (
	"id" text PRIMARY KEY NOT NULL,
	"order_booker_id" text NOT NULL,
	"trip_date" timestamp NOT NULL,
	"destination" text NOT NULL,
	"distance_km" numeric(8, 2) DEFAULT '0' NOT NULL,
	"vehicle_type" text DEFAULT 'own_vehicle' NOT NULL,
	"fuel_cost" numeric(12, 2) DEFAULT '0',
	"tada_amount" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"recorded_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "commission_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"min_amount" numeric(12, 2) NOT NULL,
	"max_amount" numeric(12, 2),
	"rate" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "commission_records" (
	"id" text PRIMARY KEY NOT NULL,
	"order_booker_id" text NOT NULL,
	"order_id" text NOT NULL,
	"fulfilled_amount" numeric(12, 2) NOT NULL,
	"applied_rate" numeric(5, 2) NOT NULL,
	"commission_amount" numeric(12, 2) NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'accrued' NOT NULL,
	"paid_in_payslip_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "order_booker_trips" ADD CONSTRAINT "order_booker_trips_order_booker_id_order_bookers_id_fk" FOREIGN KEY ("order_booker_id") REFERENCES "public"."order_bookers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_booker_trips" ADD CONSTRAINT "order_booker_trips_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_order_booker_id_order_bookers_id_fk" FOREIGN KEY ("order_booker_id") REFERENCES "public"."order_bookers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_booker_trips_order_booker_id" ON "order_booker_trips" USING btree ("order_booker_id");--> statement-breakpoint
CREATE INDEX "idx_order_booker_trips_trip_date" ON "order_booker_trips" USING btree ("trip_date");--> statement-breakpoint
CREATE INDEX "idx_commission_records_order_booker_id" ON "commission_records" USING btree ("order_booker_id");--> statement-breakpoint
CREATE INDEX "idx_commission_records_order_id" ON "commission_records" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_commission_records_status" ON "commission_records" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commission_records_order_booker_order_unique" ON "commission_records" USING btree ("order_booker_id", "order_id");--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "is_salesman" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "salesmen" ADD COLUMN IF NOT EXISTS "employee_id" text;--> statement-breakpoint
ALTER TABLE "salesmen" DROP COLUMN IF EXISTS "vehicle_type";--> statement-breakpoint
ALTER TABLE "salesmen" DROP COLUMN IF EXISTS "is_company_vehicle";--> statement-breakpoint
ALTER TABLE "salesmen" DROP COLUMN IF EXISTS "fuel_cost_per_trip";--> statement-breakpoint
ALTER TABLE "salesmen" DROP COLUMN IF EXISTS "transport_cost_per_day";