CREATE TABLE "customer_discount_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"product_id" text NOT NULL,
	"volume_threshold" integer NOT NULL CHECK (volume_threshold > 0),
	"discount_type" text NOT NULL CHECK (discount_type IN ('carton_equivalent', 'percentage', 'fixed_amount')),
	"discount_value" numeric(12, 2) NOT NULL CHECK (discount_value >= 0),
	"eligible_customer_type" text DEFAULT 'all' NOT NULL CHECK (eligible_customer_type IN ('distributor', 'retailer', 'wholesaler', 'all')),
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_discount_rules_customer_product_threshold_unique" UNIQUE("customer_id","product_id","volume_threshold")
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "customer_discount_rule_id" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "customer_discount_amount" numeric(12, 2) DEFAULT '0' CHECK (customer_discount_amount >= 0);--> statement-breakpoint
ALTER TABLE "customer_discount_rules" ADD CONSTRAINT "customer_discount_rules_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_discount_rules" ADD CONSTRAINT "customer_discount_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customer_discount_rules_customer_product" ON "customer_discount_rules" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_customer_discount_rules_dates" ON "customer_discount_rules" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_customer_discount_rules_product" ON "customer_discount_rules" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_customer_discount_rule_id_customer_discount_rules_id_fk" FOREIGN KEY ("customer_discount_rule_id") REFERENCES "public"."customer_discount_rules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invoice_items_customer_discount_rule" ON "invoice_items" USING btree ("customer_discount_rule_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_discount_value()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.discount_type = 'percentage' AND (NEW.discount_value < 0 OR NEW.discount_value > 100) THEN
    RAISE EXCEPTION 'Percentage discount must be between 0 and 100';
  END IF;
  
  IF NEW.effective_to IS NOT NULL AND NEW.effective_from > NEW.effective_to THEN
    RAISE EXCEPTION 'effective_from must be before or equal to effective_to';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER validate_discount_value_trigger
  BEFORE INSERT OR UPDATE ON "customer_discount_rules"
  FOR EACH ROW
  EXECUTE FUNCTION validate_discount_value();