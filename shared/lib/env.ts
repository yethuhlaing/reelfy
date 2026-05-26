import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const optionalUrl = z.string().url().optional()
const optionalNonEmpty = z.string().min(1).optional()

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).optional(),

    // Core
    DATABASE_URL: z.string().min(1),

    // Auth (Better Auth)
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: optionalNonEmpty,
    GOOGLE_CLIENT_SECRET: optionalNonEmpty,

    // AI / media providers (enable features when set)
    FAL_KEY: optionalNonEmpty,
    GEMINI_API_KEY: optionalNonEmpty,
    GROQ_API_KEY: optionalNonEmpty,
    NVIDIA_API_KEY: optionalNonEmpty,
    ELEVENLABS_API_KEY: optionalNonEmpty,
    ELEVENLABS_VOICE_ID: optionalNonEmpty,

    // Storage & webhooks
    BLOB_READ_WRITE_TOKEN: optionalNonEmpty,
    WEBHOOK_BASE_URL: optionalUrl,
    PUBLIC_BASE_URL: optionalUrl,

    // Defaults
    IMAGE_MODEL: z.enum(['flux-schnell-fal', 'flux-dev-fal', 'sdxl-lightning-fal']).optional(),
    MUSIC_MODEL: z.string().min(1).optional(),

    // Polar billing (optional)
    POLAR_ACCESS_TOKEN: optionalNonEmpty,
    POLAR_WEBHOOK_SECRET: optionalNonEmpty,
    POLAR_ENVIRONMENT: z.enum(['sandbox', 'production']).optional(),
    POLAR_SUCCESS_URL: optionalUrl,
    POLAR_PRODUCT_STARTER: optionalNonEmpty,
    POLAR_PRODUCT_PRO: optionalNonEmpty,
    POLAR_PRODUCT_CREDITS_SMALL: optionalNonEmpty,
    POLAR_PRODUCT_CREDITS_LARGE: optionalNonEmpty,

    // Dev / scripts
    PORT: z.string().optional(),
    WEBHOOK_SKIP_TUNNEL: z.enum(['0', '1']).optional(),
    SKIP_ENV_VALIDATION: z.enum(['0', '1']).optional(),
  },
  client: {
    NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    FAL_KEY: process.env.FAL_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL,
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
    IMAGE_MODEL: process.env.IMAGE_MODEL,
    MUSIC_MODEL: process.env.MUSIC_MODEL,
    POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
    POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
    POLAR_ENVIRONMENT: process.env.POLAR_ENVIRONMENT,
    POLAR_SUCCESS_URL: process.env.POLAR_SUCCESS_URL,
    POLAR_PRODUCT_STARTER: process.env.POLAR_PRODUCT_STARTER,
    POLAR_PRODUCT_PRO: process.env.POLAR_PRODUCT_PRO,
    POLAR_PRODUCT_CREDITS_SMALL: process.env.POLAR_PRODUCT_CREDITS_SMALL,
    POLAR_PRODUCT_CREDITS_LARGE: process.env.POLAR_PRODUCT_CREDITS_LARGE,
    PORT: process.env.PORT,
    WEBHOOK_SKIP_TUNNEL: process.env.WEBHOOK_SKIP_TUNNEL,
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === '1',
})

/** Fal webhooks + enqueue targets (dev tunnel writes WEBHOOK_BASE_URL). */
export function webhookBaseUrl(): string {
  const raw = env.WEBHOOK_BASE_URL ?? env.PUBLIC_BASE_URL
  if (!raw) {
    throw new Error('WEBHOOK_BASE_URL or PUBLIC_BASE_URL must be set')
  }
  return raw.replace(/\/$/, '')
}

export const DEFAULT_ELEVENLABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'
