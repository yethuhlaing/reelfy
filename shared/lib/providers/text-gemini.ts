import { GoogleGenerativeAI } from '@google/generative-ai'
import type { VoiceTone, SceneDensity, StickStyle } from '../types'
import type { TextProvider, PlanResult } from './text'
import { buildPlanPrompt } from '../prompts/plan'
import { withAbort } from './fal'
import type { ApiCostContext } from '@/shared/lib/db/cost-logger'
import { logApiCost } from '@/shared/lib/db/cost-logger'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const geminiProvider: TextProvider = {
  id: 'gemini-2.5-flash',
  label: 'Gemini 2.5 Flash (Google)',
  async planStory(
    story: string,
    density: SceneDensity,
    style: StickStyle,
    tone: VoiceTone,
    signal?: AbortSignal,
    costContext?: ApiCostContext,
  ): Promise<PlanResult> {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const systemInstruction = buildPlanPrompt(tone, density, style)
    const result = await withAbort(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nFOUNDER STORY:\n${story}` }] }],
      }),
      signal,
    )
    const usage = result.response.usageMetadata
    const inputTokens = usage?.promptTokenCount ?? 0
    const outputTokens = usage?.candidatesTokenCount ?? 0

    await Promise.all([
      logApiCost({
        userId: costContext?.userId,
        storyId: costContext?.storyId,
        sceneId: costContext?.sceneId,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        operation: costContext?.operation ? `${costContext.operation}_input` : 'text_plan_input',
        costUsd: (inputTokens / 1000) * 0.00015,
        creditsCharged: costContext?.creditsCharged ?? 0,
      }),
      logApiCost({
        userId: costContext?.userId,
        storyId: costContext?.storyId,
        sceneId: costContext?.sceneId,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        operation: costContext?.operation ? `${costContext.operation}_output` : 'text_plan_output',
        costUsd: (outputTokens / 1000) * 0.0006,
        creditsCharged: costContext?.creditsCharged ?? 0,
      }),
    ])

    return JSON.parse(result.response.text())
  },

  async completeJson(
    prompt: string,
    signal?: AbortSignal,
    costContext?: ApiCostContext,
  ): Promise<string> {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await withAbort(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
      signal,
    )
    const usage = result.response.usageMetadata
    const inputTokens = usage?.promptTokenCount ?? 0
    const outputTokens = usage?.candidatesTokenCount ?? 0
    const op = costContext?.operation ?? 'text_complete'

    await Promise.all([
      logApiCost({
        userId: costContext?.userId,
        storyId: costContext?.storyId,
        sceneId: costContext?.sceneId,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        operation: `${op}_input`,
        costUsd: (inputTokens / 1000) * 0.00015,
        creditsCharged: costContext?.creditsCharged ?? 0,
      }),
      logApiCost({
        userId: costContext?.userId,
        storyId: costContext?.storyId,
        sceneId: costContext?.sceneId,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        operation: `${op}_output`,
        costUsd: (outputTokens / 1000) * 0.0006,
        creditsCharged: costContext?.creditsCharged ?? 0,
      }),
    ])

    return result.response.text()
  },
}
