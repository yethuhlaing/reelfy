CREATE TABLE "credit_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"operation" text NOT NULL,
	"credits" integer NOT NULL,
	"cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"consumed" integer DEFAULT 0 NOT NULL,
	"released" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"story_id" text,
	"prompt" text NOT NULL,
	"pipeline" text,
	"brief" jsonb,
	"stage" text DEFAULT 'route' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"decision_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gate_token" text,
	"trigger_run_id" text,
	"cost_estimate" integer DEFAULT 0 NOT NULL,
	"cost_actual" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_charges" ADD CONSTRAINT "credit_charges_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_holds" ADD CONSTRAINT "credit_holds_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_holds" ADD CONSTRAINT "credit_holds_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_charges_run_asset_uidx" ON "credit_charges" USING btree ("run_id","asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_holds_run_uidx" ON "credit_holds" USING btree ("run_id");