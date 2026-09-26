import { webhookBaseUrl } from '@/shared/lib/env'

import type { WebhookUrls } from './types'

export function videoRunWebhookPath(runId: string, stepId: string): string {
  return `/api/webhooks/fal/video/run/${runId}/${stepId}`
}

export const videoWebhookUrls: WebhookUrls = {
  forStep({ runId, stepId }) {
    return `${webhookBaseUrl()}${videoRunWebhookPath(runId, stepId)}`
  },
}

export const videoProcessingWebhooks = videoWebhookUrls
