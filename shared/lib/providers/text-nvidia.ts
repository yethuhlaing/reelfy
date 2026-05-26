import type { VoiceTone, SceneDensity, StickStyle, TextModel } from '../types'
import type { TextProvider, PlanResult } from './text'
import { buildPlanPrompt } from '../prompts/plan'
import type { ApiCostContext } from '@/shared/lib/db/cost-logger'
import { logApiCost } from '@/shared/lib/db/cost-logger'

function makeNvidiaProvider(modelId: TextModel, label: string): TextProvider {
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
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelId,
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
        throw new Error(`NVIDIA API error (${res.status}): ${err}`)
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
        provider: 'nvidia',
        model: modelId,
        operation: costContext?.operation ?? 'text_plan',
        costUsd: (totalTokens / 1000) * 0.008,
        creditsCharged: costContext?.creditsCharged ?? 0,
      })
      let content = data.choices[0].message.content
      // strip markdown fences if model wraps output despite json_object mode
      const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (fenceMatch) content = fenceMatch[1]
      return JSON.parse(content)
    },

    async completeJson(
      prompt: string,
      signal?: AbortSignal,
      costContext?: ApiCostContext,
    ): Promise<string> {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 8192,
        }),
        signal,
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`NVIDIA API error (${res.status}): ${err}`)
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
        provider: 'nvidia',
        model: modelId,
        operation: costContext?.operation ?? 'text_complete',
        costUsd: (totalTokens / 1000) * 0.008,
        creditsCharged: costContext?.creditsCharged ?? 0,
      })
      return data.choices[0].message.content
    },
  }
}

export const nvidiaNemotronUltra = makeNvidiaProvider('nvidia/nemotron-ultra-253b-v1', 'Nemotron Ultra 253B — free (NVIDIA)')
