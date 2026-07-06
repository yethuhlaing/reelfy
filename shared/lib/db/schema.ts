import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export type StoryStatus = 'draft' | 'generating' | 'ready' | 'rendered' | 'failed'
export type LofiVideoStatus = 'planning' | 'generating' | 'gating' | 'rendering' | 'complete' | 'failed' | 'aborted'
export type LofiAssetStatus = 'pending' | 'submitted' | 'ready' | 'failed' | 'skipped'

/** Embedding dimension for the meme template matcher (OpenAI text-embedding-3-small). */
export const MEME_EMBEDDING_DIM = 1536

/** pgvector column type. Stored/queried as a `vector(N)` via the pgvector extension. */
export const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? MEME_EMBEDDING_DIM})`
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value.replace(/^\[|\]$/g, '').split(',').map(Number)
  },
})

const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

// BetterAuth tables
export const rateLimit = pgTable('rate_limit', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: text('role').notNull().default('user'),
    credits: integer('credits').notNull().default(0),
    freeCreditsActivated: boolean('free_credits_activated').notNull().default(false),
    polarCustomerId: text('polar_customer_id'),
    planTier: text('plan_tier').notNull().default('free'),
    createdAt,
    updatedAt,
  },
  (table) => ({
    emailIdx: uniqueIndex('user_email_unique').on(table.email),
    polarCustomerIdx: uniqueIndex('user_polar_customer_unique').on(table.polarCustomerId),
  }),
)

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull(),
    createdAt,
    updatedAt,
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    tokenIdx: uniqueIndex('session_token_unique').on(table.token),
  }),
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt,
    updatedAt,
  },
  (table) => ({
    providerAccountIdx: uniqueIndex('account_provider_account_unique').on(table.providerId, table.accountId),
  }),
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => ({
    identifierValueIdx: uniqueIndex('verification_identifier_value_unique').on(table.identifier, table.value),
  }),
)

// App tables
export const stories = pgTable('stories', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  tagline: text('tagline').notNull(),
  protagonist: text('protagonist').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  thumbnailPrompt: text('thumbnail_prompt'),
  sceneCount: integer('scene_count').notNull().default(0),
  storyInput: text('story_input').notNull().default(''),
  options: text('options').notNull().default('{}'),
  composedVideoUrl: text('composed_video_url'),
  category: text('category').notNull().default('stickman'),
  status: text('status').notNull().default('draft'),
  createdAt,
  updatedAt,
})

export const scenes = pgTable('scenes', {
  id: text('id').primaryKey(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  imageUrl: text('image_url'),
  voiceoverUrl: text('voiceover_url'),
  videoUrl: text('video_url'),
  sentence: text('sentence').notNull(),
  voiceoverText: text('voiceover_text').notNull(),
  action: text('action').notNull(),
  setting: text('setting').notNull(),
  emotion: text('emotion').notNull(),
  imagePrompt: text('image_prompt').notNull().default(''),
  motionPrompt: text('motion_prompt'),
  characters: integer('characters').notNull().default(1),
  props: text('props').notNull().default('[]'),
  voiceoverDuration: numeric('voiceover_duration', { precision: 8, scale: 3 }),
  voiceoverWordTimings: jsonb('voiceover_word_timings'),
  imageModel: text('image_model'),
  videoModel: text('video_model'),
  creditsCharged: integer('credits_charged').notNull().default(0),
  costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),
  createdAt,
})

export const lofiVideos = pgTable(
  'lofi_videos',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    storyId: text('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    vibe: text('vibe').notNull(),
    targetDurationSec: integer('target_duration_sec').notNull(),
    musicModel: text('music_model').notNull(),
    musicLoopCount: integer('music_loop_count').notNull(),
    visualMode: text('visual_mode').notNull(),
    imageModel: text('image_model'),
    videoModel: text('video_model'),
    ambientBed: text('ambient_bed'),

    status: text('status').notNull().default('planning'),

    arrangementJson: text('arrangement_json'),
    finalVideoUrl: text('final_video_url'),
    finalDurationSec: integer('final_duration_sec'),

    creditsPreAuth: integer('credits_pre_auth').notNull().default(0),
    creditsSettled: integer('credits_settled').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),

    createdAt,
    updatedAt,
  },
  (table) => ({
    userStatusIdx: index('lofi_videos_user_status_idx').on(table.userId, table.status),
    storyIdx: index('lofi_videos_story_idx').on(table.storyId),
  }),
)

export const lofiAssets = pgTable(
    'lofi_assets',
    {
        id: text('id').primaryKey(),
        videoId: text('video_id')
            .notNull()
            .references(() => lofiVideos.id, { onDelete: 'cascade' }),

        kind: text('kind').notNull(),
        orderIndex: integer('order_index').notNull(),
        prompt: text('prompt').notNull(),
        model: text('model').notNull(),
        durationSec: integer('duration_sec').notNull(),

        falJobId: text('fal_job_id'),
        status: text('status').notNull().default('pending'),
        retryCount: integer('retry_count').notNull().default(0),
        errorMessage: text('error_message'),

        resultUrl: text('result_url'),
        // Stock music tracking columns
        sourceProvider: text('source_provider'),    // null | 'freetouse'
        sourceTrackId: text('source_track_id'),    // provider track id when sourceProvider is set
        sourceLicence: text('source_licence'),     // licence text snapshot at pick time
        sourceAttribution: text('source_attribution'),  // attribution string (null for freetouse)

        creditsCharged: integer('credits_charged').notNull().default(0),
        costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),

        createdAt,
    },
    (table) => ({
        videoStatusIdx: index('lofi_assets_video_status_idx').on(table.videoId, table.status),
        falJobIdx: index('lofi_assets_fal_job_idx').on(table.falJobId),
    }),
)

export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    polarOrderId: text('polar_order_id').notNull(),
    creditsPurchased: integer('credits_purchased').notNull(),
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    packType: text('pack_type').notNull(),
    createdAt,
  },
  (table) => ({
    polarOrderIdIdx: uniqueIndex('payments_polar_order_id_unique').on(table.polarOrderId),
  }),
)

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    polarSubscriptionId: text('polar_subscription_id').notNull(),
    polarProductId: text('polar_product_id').notNull(),
    planTier: text('plan_tier').notNull(),
    status: text('status').notNull(),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => ({
    polarSubIdx: uniqueIndex('subscriptions_polar_sub_unique').on(table.polarSubscriptionId),
    userIdx: uniqueIndex('subscriptions_user_unique').on(table.userId),
  }),
)

export const apiUsageEvents = pgTable('api_usage_events', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  meter: text('meter').notNull(),
  quantity: integer('quantity').notNull().default(1),
  route: text('route').notNull(),
  metadata: text('metadata').notNull().default('{}'),
  polarEventId: text('polar_event_id'),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }),
  createdAt,
})

export const apiCostLogs = pgTable('api_cost_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  storyId: text('story_id').references(() => stories.id, { onDelete: 'set null' }),
  sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  operation: text('operation').notNull(),
  costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull(),
  creditsCharged: integer('credits_charged').notNull().default(0),
  createdAt,
})

export const appConfig = pgTable('app_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const waitlist = pgTable(
  'waitlist',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    createdAt,
  },
  (table) => [uniqueIndex('waitlist_email_unique').on(table.email)],
)

// Meme generator: curated template library.
export const memeTemplates = pgTable(
  'meme_templates',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    imageUrl: text('image_url').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    // Text used to build the embedding + as LLM matching context.
    description: text('description').notNull(),
    // Joke structure guidance for the caption LLM.
    captionGuide: text('caption_guide').notNull().default(''),
    // Per-box geometry + style. Array of MemeTextBox (percent-based).
    textBoxes: jsonb('text_boxes').notNull().default(sql`'[]'::jsonb`),
    // Role of each box in the joke, aligned by index. e.g. ["rejected option","preferred option"].
    boxRoles: jsonb('box_roles').notNull().default(sql`'[]'::jsonb`),
    // Few-shot sample fills for the caption LLM. Array of string[] (one per box).
    examples: jsonb('examples').notNull().default(sql`'[]'::jsonb`),
    toneTags: jsonb('tone_tags').notNull().default(sql`'[]'::jsonb`),
    // description + captionGuide embedding for pgvector retrieval.
    embedding: vector('embedding', { dimensions: MEME_EMBEDDING_DIM }),
    // Manual weekly bump for lightweight trend boosting.
    trendingScore: real('trending_score').notNull().default(0),
    // Provenance for future licence filtering.
    source: text('source').notNull().default('imgflip'),
    license: text('license'),
    active: boolean('active').notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => ({
    slugIdx: uniqueIndex('meme_templates_slug_unique').on(table.slug),
    activeIdx: index('meme_templates_active_idx').on(table.active),
  }),
)

// Generated meme records (legacy — superseded by meme_generations).
export const memes = pgTable(
  'memes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    inputText: text('input_text').notNull(),
    templateId: text('template_id')
      .notNull()
      .references(() => memeTemplates.id, { onDelete: 'restrict' }),
    // Rendered box state (MemeRenderBox[]): text + geometry + style at export time.
    boxes: jsonb('boxes').notNull().default(sql`'[]'::jsonb`),
    imageUrl: text('image_url').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    creditsCharged: integer('credits_charged').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),
    createdAt,
  },
  (table) => ({
    userCreatedIdx: index('memes_user_created_idx').on(table.userId, table.createdAt),
  }),
)

// One saved generation = user prompt + all variant options.
export const memeGenerations = pgTable(
  'meme_generations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    inputText: text('input_text').notNull(),
    variants: jsonb('variants').notNull().default(sql`'[]'::jsonb`),
    creditsCharged: integer('credits_charged').notNull().default(1),
    createdAt,
  },
  (table) => ({
    userCreatedIdx: index('meme_generations_user_created_idx').on(table.userId, table.createdAt),
  }),
)

export const schema = {
  user,
  session,
  account,
  verification,
  rateLimit,
  stories,
  scenes,
  lofiVideos,
  lofiAssets,
  payments,
  subscriptions,
  apiUsageEvents,
  apiCostLogs,
  appConfig,
  waitlist,
  memeTemplates,
  memes,
  memeGenerations,
}

export type DatabaseSchema = typeof schema
