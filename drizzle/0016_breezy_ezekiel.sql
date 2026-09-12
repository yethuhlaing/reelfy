CREATE TABLE "video_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"target" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"retryable" boolean,
	"credits_reserved" integer DEFAULT 0 NOT NULL,
	"credits_consumed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_runs" ADD CONSTRAINT "video_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_runs_target_idx" ON "video_runs" USING btree ("target_kind","target_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "video_runs_target_inflight_uidx" ON "video_runs" USING btree ("target_kind","target_id") WHERE "video_runs"."status" in ('pending', 'running');