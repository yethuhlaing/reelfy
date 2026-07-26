import { openai } from '@ai-sdk/openai'
import { briefSchema } from '@/features/chat/pipelines/schemas'
import { DEFAULT_PIPELINE_ID, getPipeline, pipelineCatalog } from '@/features/chat/pipelines'
import { generateValidated } from '@/features/chat/server/validate'

export async function routePrompt(prompt: string) {
  const catalog = pipelineCatalog()
  const result = await generateValidated({
    model: openai('gpt-4o-mini'),
    schema: briefSchema,
    system: `You route a user's video request to ONE production pipeline and draft a brief.
Available pipelines:
${catalog.map((p) => `- ${p.id}: ${p.description}`).join('\n')}
Choose the best-fit pipeline id exactly as listed. Draft a concept, title, format, duration, and visual approach.
Do NOT invent capabilities outside the listed pipelines.`,
    prompt,
  })

  const pipeline = getPipeline(result.pipeline)
  if (!pipeline) {
    return {
      brief: { ...result, pipeline: DEFAULT_PIPELINE_ID },
      fellBack: true,
    }
  }

  return { brief: result, fellBack: false }
}
