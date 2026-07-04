CREATE TABLE "meme_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"input_text" text NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"credits_charged" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meme_generations" ADD CONSTRAINT "meme_generations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meme_generations_user_created_idx" ON "meme_generations" USING btree ("user_id","created_at");
