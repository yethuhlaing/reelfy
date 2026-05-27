import { webhookBaseUrl } from '@/shared/lib/env'

export function buildWebhookUrl(kind: 'animate' | 'compose' | 'export', jobId: string): string {
  return `${webhookBaseUrl()}/api/webhooks/fal/${kind}/${jobId}`
}
