-- Better Auth expects the rate_limit table to have an `id` primary key with
-- `key` as a unique (non-PK) column. The original 0000 migration made `key`
-- the primary key, so we swap the PK here.
--
-- rate_limit only holds transient throttling counters, so truncating is safe:
-- it lets us add the NOT NULL `id` PK without backfilling values.
TRUNCATE TABLE "rate_limit";--> statement-breakpoint
ALTER TABLE "rate_limit" DROP CONSTRAINT "rate_limit_pkey";--> statement-breakpoint
ALTER TABLE "rate_limit" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_key_unique" ON "rate_limit" USING btree ("key");
