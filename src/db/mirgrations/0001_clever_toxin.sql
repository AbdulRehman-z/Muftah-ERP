ALTER TABLE "production_runs" ADD COLUMN "initiator_id" text;--> statement-breakpoint
ALTER TABLE "production_runs" ADD COLUMN "shortfall_units" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "production_runs" ADD COLUMN "shortfall_reason" text;--> statement-breakpoint
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_initiator_id_user_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;