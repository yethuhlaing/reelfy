ALTER TABLE "scenes" ADD COLUMN "image_prompt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "motion_prompt" text;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "characters" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "props" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "voiceover_duration" numeric(8, 3);--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "thumbnail_prompt" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "story_input" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "options" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "composed_video_url" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "category" text DEFAULT 'stickman' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;