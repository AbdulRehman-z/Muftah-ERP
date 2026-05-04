CREATE TABLE "credit_recovery_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"slip_id" text NOT NULL,
	"assigned_to_id" text,
	"attempt_method" text DEFAULT 'call' NOT NULL,
	"attempt_outcome" text DEFAULT 'no_answer' NOT NULL,
	"amount_promised" numeric(12, 2),
	"promised_date" timestamp,
	"notes" text,
	"attempted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slip_records" ADD COLUMN "recovery_status" text;--> statement-breakpoint
ALTER TABLE "slip_records" ADD COLUMN "recovery_assigned_to_id" text;--> statement-breakpoint
ALTER TABLE "slip_records" ADD COLUMN "next_follow_up_date" timestamp;--> statement-breakpoint
ALTER TABLE "slip_records" ADD COLUMN "last_follow_up_date" timestamp;--> statement-breakpoint
ALTER TABLE "slip_records" ADD COLUMN "escalation_level" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "credit_recovery_attempts" ADD CONSTRAINT "credit_recovery_attempts_slip_id_slip_records_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."slip_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_recovery_attempts" ADD CONSTRAINT "credit_recovery_attempts_assigned_to_id_salesmen_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."salesmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_credit_recovery_attempts_slip_id" ON "credit_recovery_attempts" USING btree ("slip_id");--> statement-breakpoint
ALTER TABLE "slip_records" ADD CONSTRAINT "slip_records_recovery_assigned_to_id_salesmen_id_fk" FOREIGN KEY ("recovery_assigned_to_id") REFERENCES "public"."salesmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_slip_records_status" ON "slip_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_slip_records_recovery_status" ON "slip_records" USING btree ("recovery_status");--> statement-breakpoint
CREATE INDEX "idx_slip_records_recovery_assigned" ON "slip_records" USING btree ("recovery_assigned_to_id");--> statement-breakpoint
CREATE INDEX "idx_slip_records_next_follow_up" ON "slip_records" USING btree ("next_follow_up_date");