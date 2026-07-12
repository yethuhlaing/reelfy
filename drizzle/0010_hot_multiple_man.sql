CREATE TABLE IF NOT EXISTS "brainrot_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"input_text" text NOT NULL,
	"script" text DEFAULT '' NOT NULL,
	"format" text NOT NULL,
	"background_category" text DEFAULT '' NOT NULL,
	"character_voice_id" text DEFAULT '' NOT NULL,
	"caption_position" text DEFAULT 'bottom' NOT NULL,
	"voiceover_url" text,
	"voiceover_duration_sec" numeric(8, 3),
	"voiceover_word_timings" jsonb,
	"background_video_id" text,
	"chunk_start_index" integer,
	"chunk_urls" jsonb,
	"output_video_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meme_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"input_text" text NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"credits_charged" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "brainrot_projects" ADD CONSTRAINT "brainrot_projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "meme_generations" ADD CONSTRAINT "meme_generations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brainrot_projects_user_created_idx" ON "brainrot_projects" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meme_generations_user_created_idx" ON "meme_generations" USING btree ("user_id","created_at");
