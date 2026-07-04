CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "meme_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"image_url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"description" text NOT NULL,
	"caption_guide" text DEFAULT '' NOT NULL,
	"text_boxes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"box_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tone_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" vector(1536),
	"trending_score" real DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'imgflip' NOT NULL,
	"license" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"input_text" text NOT NULL,
	"template_id" text NOT NULL,
	"boxes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memes" ADD CONSTRAINT "memes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memes" ADD CONSTRAINT "memes_template_id_meme_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."meme_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meme_templates_slug_unique" ON "meme_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "meme_templates_active_idx" ON "meme_templates" USING btree ("active");--> statement-breakpoint
CREATE INDEX "memes_user_created_idx" ON "memes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "meme_templates_embedding_idx" ON "meme_templates" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);