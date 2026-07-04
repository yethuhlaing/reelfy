import { env } from '@/shared/lib/env'
import { MEME_EMBEDDING_DIM } from '@/shared/lib/db/schema'

const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings'

/** OpenRouter-routed embedding model. 1536-dim, matches MEME_EMBEDDING_DIM. */
export const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

interface EmbeddingResponse {
  data: { embedding: number[] }[]
}

/**
 * Embed one or more texts through OpenRouter's /embeddings endpoint.
 * Mirrors the auth/headers used by the chat provider (text-openrouter.ts).
 */
export async function embedTexts(
  inputs: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  if (inputs.length === 0) return []
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    'X-Title': 'Reelify',
  }
  if (env.PUBLIC_BASE_URL) headers['HTTP-Referer'] = env.PUBLIC_BASE_URL

  const res = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs }),
    signal,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter embeddings error (${res.status}): ${err}`)
  }

  const data = (await res.json()) as EmbeddingResponse
  const vectors = data.data.map((d) => d.embedding)
  for (const v of vectors) {
    if (v.length !== MEME_EMBEDDING_DIM) {
      throw new Error(
        `Embedding dim mismatch: got ${v.length}, expected ${MEME_EMBEDDING_DIM}`,
      )
    }
  }
  return vectors
}

/** Convenience: embed a single string. */
export async function embedText(input: string, signal?: AbortSignal): Promise<number[]> {
  const [vec] = await embedTexts([input], signal)
  return vec
}
