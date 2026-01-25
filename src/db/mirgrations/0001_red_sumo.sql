ALTER TABLE "warehouses" RENAME COLUMN "location" TO "address";--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "latitude" numeric(10, 8) NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "longitude" numeric(11, 8) NOT NULL;--> statement-breakpoint
CREATE INDEX "coords_idx" ON "warehouses" USING btree ("latitude","longitude");