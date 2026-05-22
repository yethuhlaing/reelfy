import type { VoiceTone, SceneDensity, StickStyle, TextModel } from '../types'
import type { TextProvider, PlanResult } from './text'
import { buildPlanPrompt } from '../prompts/plan'
import type { ApiCostContext } from '@/lib/db/cost-logger'
import { logApiCost } from '@/lib/db/cost-logger'

function makeGroqProvider(modelId: TextModel, label: string): TextProvider {
  return {
    id: modelId,
    label,
    async planStory(
      story: string,
      density: SceneDensity,
      style: StickStyle,
      tone: VoiceTone,
      signal?: AbortSignal,
      costContext?: ApiCostContext,
    ): Promise<PlanResult> {
      const systemPrompt = buildPlanPrompt(tone, density, style)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelId.replace('groq/', ''),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `FOUNDER STORY:\n${story}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 8192,
        }),
        signal,
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Groq API error (${res.status}): ${err}`)
      }
      const data = (await res.json()) as {
        choices: { message: { content: string } }[]
        usage?: { total_tokens?: number }
      }
      const totalTokens = data.usage?.total_tokens ?? 0
      await logApiCost({
        userId: costContext?.userId,
        storyId: costContext?.storyId,
        sceneId: costContext?.sceneId,
        provider: 'groq',
        model: modelId.replace('groq/', ''),
        operation: costContext?.operation ?? 'text_plan',
        costUsd: (totalTokens / 1000) * 0.00059,
        creditsCharged: costContext?.creditsCharged ?? 0,
      })
      return JSON.parse(data.choices[0].message.content)
    },
  }
}

export const groqLlama70b = makeGroqProvider('groq/llama-3.3-70b-versatile', 'Llama 3.3 70B — free (Groq)')
export const groqDeepSeekR1 = makeGroqProvider('groq/deepseek-r1-distill-llama-70b', 'DeepSeek R1 70B — free (Groq)')
