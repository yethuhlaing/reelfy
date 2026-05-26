-- Lofi video generation tables

CREATE TABLE "lofi_videos" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "story_id" text NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "vibe" text NOT NULL,
  "target_duration_sec" integer NOT NULL,
  "music_model" text NOT NULL,
  "music_loop_count" integer NOT NULL,
  "visual_mode" text NOT NULL,
  "image_model" text,
  "video_model" text,
  "ambient_bed" text,
  "status" text DEFAULT 'planning' NOT NULL,
  "arrangement_json" text,
  "final_video_url" text,
  "final_duration_sec" integer,
  "credits_pre_auth" integer DEFAULT 0 NOT NULL,
  "credits_settled" integer DEFAULT 0 NOT NULL,
  "cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "lofi_videos_user_status_idx" ON "lofi_videos" ("user_id", "status");--> statement-breakpoint
CREATE INDEX "lofi_videos_story_idx" ON "lofi_videos" ("story_id");--> statement-breakpoint

CREATE TABLE "lofi_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "video_id" text NOT NULL REFERENCES "lofi_videos"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "order_index" integer NOT NULL,
  "prompt" text NOT NULL,
  "model" text NOT NULL,
  "duration_sec" integer NOT NULL,
  "fal_job_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "error_message" text,
  "result_url" text,
  "credits_charged" integer DEFAULT 0 NOT NULL,
  "cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "lofi_assets_video_status_idx" ON "lofi_assets" ("video_id", "status");--> statement-breakpoint
CREATE INDEX "lofi_assets_fal_job_idx" ON "lofi_assets" ("fal_job_id")
