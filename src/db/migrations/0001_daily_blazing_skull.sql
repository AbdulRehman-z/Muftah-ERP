CREATE TABLE "category_field_options" (
	"id" text PRIMARY KEY NOT NULL,
	"field_id" text NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"field_type" text NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"placeholder" text,
	"helper_text" text,
	"min_length" integer,
	"max_length" integer,
	"min_number" numeric(12, 2),
	"max_number" numeric(12, 2),
	"min_date" timestamp,
	"max_date" timestamp,
	"regex_pattern" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_field_values" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"field_id" text NOT NULL,
	"value_text" text,
	"value_number" numeric(12, 2),
	"value_date" timestamp,
	"value_boolean" boolean,
	"value_option_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "expense_date" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "slip_number" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "remarks" text;--> statement-breakpoint
ALTER TABLE "category_field_options" ADD CONSTRAINT "category_field_options_field_id_category_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."category_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_fields" ADD CONSTRAINT "category_fields_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_field_values" ADD CONSTRAINT "expense_field_values_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_field_values" ADD CONSTRAINT "expense_field_values_field_id_category_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."category_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_field_values" ADD CONSTRAINT "expense_field_values_value_option_id_category_field_options_id_fk" FOREIGN KEY ("value_option_id") REFERENCES "public"."category_field_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_field_options_field_sort_idx" ON "category_field_options" USING btree ("field_id","is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "category_field_options_field_value_unique" ON "category_field_options" USING btree ("field_id","value");--> statement-breakpoint
CREATE INDEX "category_fields_category_sort_idx" ON "category_fields" USING btree ("category_id","is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "category_fields_category_key_unique" ON "category_fields" USING btree ("category_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_field_values_expense_field_unique" ON "expense_field_values" USING btree ("expense_id","field_id");--> statement-breakpoint
CREATE INDEX "expense_field_values_field_text_idx" ON "expense_field_values" USING btree ("field_id","value_text");--> statement-breakpoint
CREATE INDEX "expense_field_values_field_number_idx" ON "expense_field_values" USING btree ("field_id","value_number");--> statement-breakpoint
CREATE INDEX "expense_field_values_field_date_idx" ON "expense_field_values" USING btree ("field_id","value_date");--> statement-breakpoint
CREATE INDEX "expense_field_values_field_boolean_idx" ON "expense_field_values" USING btree ("field_id","value_boolean");--> statement-breakpoint
CREATE INDEX "expense_field_values_field_option_idx" ON "expense_field_values" USING btree ("field_id","value_option_id");--> statement-breakpoint
CREATE INDEX "expense_categories_sort_idx" ON "expense_categories" USING btree ("sort_order","name");--> statement-breakpoint
CREATE INDEX "expense_categories_active_idx" ON "expense_categories" USING btree ("is_active","is_archived");--> statement-breakpoint
CREATE INDEX "expenses_category_date_idx" ON "expenses" USING btree ("category_id","expense_date","id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "expenses_wallet_date_idx" ON "expenses" USING btree ("wallet_id","expense_date");--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_slug_unique" UNIQUE("slug");