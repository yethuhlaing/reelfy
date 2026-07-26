import { generateObject } from 'ai'
import type { z } from 'zod'

type GenerateValidatedParams<T extends z.ZodTypeAny> = {
  model: Parameters<typeof generateObject>[0]['model']
  schema: T
  system: string
  prompt: string
  maxRounds?: number
}

export async function generateValidated<T extends z.ZodTypeAny>(
  params: GenerateValidatedParams<T>,
): Promise<z.infer<T>> {
  const maxRounds = params.maxRounds ?? 2
  let prompt = params.prompt
  let lastErr: unknown

  for (let i = 0; i <= maxRounds; i++) {
    try {
      const { object } = await generateObject({
        model: params.model,
        schema: params.schema,
        system: params.system,
        prompt,
      })
      return object as z.infer<T>
    } catch (e) {
      lastErr = e
      prompt += `\n\nYour previous output failed validation: ${String(e)}. Fix it.`
    }
  }

  throw lastErr
}
