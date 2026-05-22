-- User: Polar customer + plan tier
ALTER TABLE "user" ADD COLUMN "polar_customer_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan_tier" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_polar_customer_unique" ON "user" ("polar_customer_id");--> statement-breakpoint

-- Payments: rename stripe_payment_id → polar_order_id
DROP INDEX IF EXISTS "payments_stripe_payment_id_unique";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "stripe_payment_id" TO "polar_order_id";--> statement-breakpoint
CREATE UNIQUE INDEX "payments_polar_order_id_unique" ON "payments" ("polar_order_id");--> statement-breakpoint

-- Subscriptions
CREATE TABLE "subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "polar_subscription_id" text NOT NULL,
  "polar_product_id" text NOT NULL,
  "plan_tier" text NOT NULL,
  "status" text NOT NULL,
  "current_period_start" timestamp with time zone,
  "current_period_end" timestamp with time zone,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_polar_sub_unique" ON "subscriptions" ("polar_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_unique" ON "subscriptions" ("user_id");--> statement-breakpoint

-- API usage events
CREATE TABLE "api_usage_events" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "meter" text NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "route" text NOT NULL,
  "metadata" text DEFAULT '{}' NOT NULL,
  "polar_event_id" text,
  "ingested_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "api_usage_events_user_idx" ON "api_usage_events" ("user_id");--> statement-breakpoint
CREATE INDEX "api_usage_events_meter_idx" ON "api_usage_events" ("meter");
