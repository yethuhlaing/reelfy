CREATE TABLE "api_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"meter" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"route" text NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"polar_event_id" text,
	"ingested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"polar_subscription_id" text NOT NULL,
	"polar_product_id" text NOT NULL,
	"plan_tier" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "polar_customer_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan_tier" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_usage_events" ADD CONSTRAINT "api_usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_polar_sub_unique" ON "subscriptions" USING btree ("polar_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_unique" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_polar_customer_unique" ON "user" USING btree ("polar_customer_id");