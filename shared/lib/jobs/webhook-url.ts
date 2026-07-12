import { webhookBaseUrl } from '@/shared/lib/env'

export function buildWebhookUrl(
  kind:
    | 'story/animate'
    | 'story/compose'
    | 'story/export'
    | 'brainrot/export',
  jobId: string,
): string {
  return `${webhookBaseUrl()}/api/webhooks/fal/${kind}/${jobId}`
}
