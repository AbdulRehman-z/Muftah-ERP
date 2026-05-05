-- Order Booker Self-Service Auth (linked to Better Auth user)
ALTER TABLE "order_bookers" ADD COLUMN IF NOT EXISTS "user_id" text;
-- Remove earlier PIN columns if they were added
ALTER TABLE "order_bookers" DROP COLUMN IF EXISTS "pin_hash";
ALTER TABLE "order_bookers" DROP COLUMN IF EXISTS "last_login_at";
