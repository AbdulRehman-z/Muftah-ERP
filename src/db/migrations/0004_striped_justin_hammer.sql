CREATE TABLE "order_bookers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"vehicle_type" text DEFAULT 'own_vehicle',
	"is_company_vehicle" boolean DEFAULT false,
	"fuel_cost_per_trip" numeric(12, 2) DEFAULT '0',
	"commission_rate" numeric(5, 2) DEFAULT '0',
	"employee_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"unit_type" text DEFAULT 'full_carton' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"rate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"bill_number" serial NOT NULL,
	"order_booker_id" text NOT NULL,
	"shopkeeper_name" text NOT NULL,
	"shopkeeper_mobile" text,
	"shopkeeper_address" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "salesmen" ADD COLUMN "vehicle_type" text DEFAULT 'own_vehicle';--> statement-breakpoint
ALTER TABLE "salesmen" ADD COLUMN "is_company_vehicle" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "salesmen" ADD COLUMN "fuel_cost_per_trip" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "salesmen" ADD COLUMN "transport_cost_per_day" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "default_margin" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_booker_id_order_bookers_id_fk" FOREIGN KEY ("order_booker_id") REFERENCES "public"."order_bookers"("id") ON DELETE no action ON UPDATE no action;