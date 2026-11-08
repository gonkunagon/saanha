ALTER TABLE "orders" ADD COLUMN "quoted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quote_rate" double precision;