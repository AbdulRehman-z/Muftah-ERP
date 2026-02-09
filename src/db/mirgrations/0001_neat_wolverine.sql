ALTER TABLE "chemicals" ADD COLUMN "packaging_type" text;--> statement-breakpoint
ALTER TABLE "chemicals" ADD COLUMN "packaging_size" text;--> statement-breakpoint
ALTER TABLE "packaging_materials" ADD COLUMN "weight_per_pack" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "packaging_materials" ADD COLUMN "price_per_kg" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "packaging_materials" ADD COLUMN "associated_sticker_id" text;--> statement-breakpoint
ALTER TABLE "packaging_materials" ADD COLUMN "sticker_cost" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "packaging_materials" ADD CONSTRAINT "packaging_materials_associated_sticker_id_packaging_materials_id_fk" FOREIGN KEY ("associated_sticker_id") REFERENCES "public"."packaging_materials"("id") ON DELETE no action ON UPDATE no action;