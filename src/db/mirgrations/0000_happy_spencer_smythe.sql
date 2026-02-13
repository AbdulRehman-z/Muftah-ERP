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
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
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
	"quantity_per_container" numeric(10, 3) NOT NULL,
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
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"address" text,
	"type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"quantity_cartons" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text,
	"customer_id" text,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"profit_margin" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"payment_method" text,
	"warehouse_id" text NOT NULL,
	"performed_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
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
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "fg_warehouse_recipe_idx" ON "finished_goods_stock" USING btree ("warehouse_id","recipe_id");--> statement-breakpoint
CREATE INDEX "audit_warehouse_idx" ON "inventory_audit_log" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "audit_date_idx" ON "inventory_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_warehouse_idx" ON "material_stock" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "ingredients_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "packaging_recipe_idx" ON "recipe_packaging" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "purchase_supplier_idx" ON "purchase_records" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_warehouse_idx" ON "purchase_records" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "purchase_date_idx" ON "purchase_records" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "payment_supplier_idx" ON "supplier_payments" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "payment_purchase_idx" ON "supplier_payments" USING btree ("purchase_id");