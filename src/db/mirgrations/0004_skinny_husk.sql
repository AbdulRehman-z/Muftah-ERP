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
ALTER TABLE "chemical_lab_reports" ADD CONSTRAINT "chemical_lab_reports_chemical_id_chemicals_id_fk" FOREIGN KEY ("chemical_id") REFERENCES "public"."chemicals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chemical_lab_reports" ADD CONSTRAINT "chemical_lab_reports_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_report_chemical_idx" ON "chemical_lab_reports" USING btree ("chemical_id");--> statement-breakpoint
CREATE INDEX "lab_report_date_idx" ON "chemical_lab_reports" USING btree ("report_date");