export function buildWebhookUrl(kind: 'animate' | 'compose', jobId: string): string {
  const base = process.env.WEBHOOK_BASE_URL
  if (!base) throw new Error('WEBHOOK_BASE_URL is not configured')
  const trimmed = base.replace(/\/$/, '')
  return `${trimmed}/api/webhooks/fal/${kind}/${jobId}`
}
