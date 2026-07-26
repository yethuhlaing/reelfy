import { schedules } from '@trigger.dev/sdk/v3'
import { sweepStaleGateRuns } from '@/features/chat/server/ops'

export const sweepRuns = schedules.task({
  id: 'sweep-abandoned-runs',
  cron: '0 */6 * * *',
  run: async () => {
    const count = await sweepStaleGateRuns(24)
    return { swept: count }
  },
})
