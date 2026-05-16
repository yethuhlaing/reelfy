import type { VoiceTone, SceneDensity, StickStyle, TextModel } from '../types'
import type { TextProvider, PlanResult } from './text'
import { buildPlanPrompt } from '../prompts/plan'

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
      const data = (await res.json()) as { choices: { message: { content: string } }[] }
      return JSON.parse(data.choices[0].message.content)
    },
  }
}

export const nvidiaNemotronUltra = makeNvidiaProvider('nvidia/nemotron-ultra-253b-v1', 'Nemotron Ultra 253B — free preview')
export const nvidiaNemotronNano30b = makeNvidiaProvider('nvidia/nemotron-3-nano-30b-a3b', 'Nemotron Nano 30B — free tier')
export const nvidiaNemotronNano9b = makeNvidiaProvider('nvidia/nemotron-nano-9b-v2', 'Nemotron Nano 9B — $0.04/1M')
export const nvidiaLlama49b = makeNvidiaProvider('nvidia/llama-3.3-nemotron-super-49b-v1.5', 'Llama 3.3 Nemotron 49B — $0.10/1M')
export const nvidiaNemotronNano12b = makeNvidiaProvider('nvidia/nemotron-nano-12b-v2', 'Nemotron Nano 12B — $0.20/1M')
export const nvidiaLlama70b = makeNvidiaProvider('nvidia/llama-3.1-nemotron-70b-instruct', 'Llama 3.1 Nemotron 70B — $0.60/1M')
export const nvidiaMixtral8x22b = makeNvidiaProvider('nvidia/mixtral-8x22b-instruct-v0.1', 'Mixtral 8x22B — $1.20/1M')
