import { GoogleGenerativeAI } from '@google/generative-ai'
import type { VoiceTone, SceneDensity, StickStyle } from '../types'
import type { TextProvider, PlanResult } from './text'
import { buildPlanPrompt } from '../plan-prompt'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const geminiProvider: TextProvider = {
  id: 'gemini-2.5-flash',
  label: 'Gemini 2.5 Flash (Google)',
  async planStory(story: string, density: SceneDensity, style: StickStyle, tone: VoiceTone): Promise<PlanResult> {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const systemInstruction = buildPlanPrompt(tone, density, style)
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nFOUNDER STORY:\n${story}` }] }],
    })
    return JSON.parse(result.response.text())
  },
}
