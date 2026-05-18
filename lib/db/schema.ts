import {
  bigint,
  boolean,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

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
    createdAt,
    updatedAt,
  },
  (table) => ({
    emailIdx: uniqueIndex('user_email_unique').on(table.email),
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
  sceneCount: integer('scene_count').notNull().default(0),
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
  imageModel: text('image_model'),
  videoModel: text('video_model'),
  creditsCharged: integer('credits_charged').notNull().default(0),
  costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),
  createdAt,
})

export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    stripePaymentId: text('stripe_payment_id').notNull(),
    creditsPurchased: integer('credits_purchased').notNull(),
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    packType: text('pack_type').notNull(),
    createdAt,
  },
  (table) => ({
    stripePaymentIdIdx: uniqueIndex('payments_stripe_payment_id_unique').on(table.stripePaymentId),
  }),
)

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

export const schema = {
  user,
  session,
  account,
  verification,
  rateLimit,
  stories,
  scenes,
  payments,
  apiCostLogs,
  appConfig,
}

export type DatabaseSchema = typeof schema
