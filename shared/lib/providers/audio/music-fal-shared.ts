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
  buildInput: (input: MusicGenInput & { durationSec: number }) => Record<string, unknown>
}): MusicGenProvider {
  return {
    key: config.key,
    label: config.label,
    maxDurationSec: config.maxDurationSec,
    defaultDurationSec: config.defaultDurationSec,
    creditsPerLoop: config.creditsPerLoop,
    costPerLoopUsd: config.costPerLoopUsd,
    async submit(input) {
      const durationSec = Math.min(
        input.durationSec > 0 ? input.durationSec : config.defaultDurationSec,
        config.maxDurationSec,
      )
      const submitted = await fal.queue.submit(config.falModel, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: config.buildInput({ ...input, durationSec }) as any,
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
