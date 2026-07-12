import { getTextProvider } from '@/shared/lib/providers/text/text'
import { stripFences } from '@/shared/lib/providers/openai/client'
import {
  brainrotPlanRequest,
  type BrainrotPlanResult,
} from '@/shared/lib/prompts/brainrot-plan'
import type { BrainrotFormat } from '@/shared/lib/types/brainrot'
import type { ApiCostContext } from '@/shared/lib/db/cost-logger'

export async function planBrainrotScript(
  input: string,
  format: BrainrotFormat,
  signal?: AbortSignal,
  costContext?: ApiCostContext,
): Promise<BrainrotPlanResult> {
  const provider = getTextProvider()
  const raw = await provider.completeJson(brainrotPlanRequest(format, input), signal, {
    ...costContext,
    operation: costContext?.operation ?? 'brainrot_script',
  })
  const parsed = JSON.parse(stripFences(raw)) as BrainrotPlanResult
  if (!parsed.title || !parsed.script) {
    throw new Error('Invalid script plan response')
  }
  return {
    title: String(parsed.title).trim(),
    script: String(parsed.script).trim(),
  }
}
