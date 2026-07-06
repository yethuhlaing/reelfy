import { MEME_EMBEDDING_DIM } from '@/shared/lib/db/schema'
import { embed } from '@/shared/lib/providers/openai/client'

/** OpenAI embedding model. 1536-dim, matches MEME_EMBEDDING_DIM. */
export const EMBEDDING_MODEL = 'text-embedding-3-small'

/** Embed one or more texts via OpenAI. Validates the vector dimension. */
export async function embedTexts(
  inputs: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  if (inputs.length === 0) return []

  const { vectors } = await embed(inputs, EMBEDDING_MODEL, signal)
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
