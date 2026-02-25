ALTER TABLE "customers" ADD COLUMN "cnic" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "bank_account" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "quantity" integer DEFAULT 0 NOT NULL;