import { fal } from '@/shared/lib/providers/fal'
import type { MusicGenInput, MusicGenProvider } from './music'

export function createFalMusicProvider(config: {
  key: string
  label: string
  falModel: string
  maxDurationSec: number
  defaultDurationSec: number
  creditsPerLoop: number
  costPerLoopUsd: number
  buildInput: (input: { prompt: string; durationSec: number }) => Record<string, unknown>
}): MusicGenProvider {
  function queueInput(input: Omit<MusicGenInput, 'webhookUrl'>): Record<string, unknown> {
    const durationSec = Math.min(
      input.durationSec > 0 ? input.durationSec : config.defaultDurationSec,
      config.maxDurationSec,
    )
    return config.buildInput({ prompt: input.prompt, durationSec })
  }

  return {
    key: config.key,
    label: config.label,
    falModel: config.falModel,
    maxDurationSec: config.maxDurationSec,
    defaultDurationSec: config.defaultDurationSec,
    creditsPerLoop: config.creditsPerLoop,
    costPerLoopUsd: config.costPerLoopUsd,
    queueInput,
    async submit(input) {
      const submitted = await fal.queue.submit(config.falModel, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: queueInput(input) as any,
        webhookUrl: input.webhookUrl,
      })
      return {
        jobId: submitted.request_id,
        falModel: config.falModel,
        estimatedCostUsd: config.costPerLoopUsd,
      }
    },
  }
}
