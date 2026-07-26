'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeRun } from '@trigger.dev/react-hooks'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const STAGES = ['plan', 'gate', 'assets', 'compose', 'done'] as const

type GateMeta = {
  estimate?: number
  plan?: {
    title?: string
    sceneCount?: number
    scenes?: { id: string; sentence: string; voiceoverText: string }[]
  }
  providers?: Record<string, string>
}

export function RunStream({
  runId,
  triggerRunId,
  initialToken,
  storyId,
}: {
  runId: string
  triggerRunId: string | null
  initialToken: string | null
  storyId: string | null
}) {
  const router = useRouter()
  const [token, setToken] = useState(initialToken)
  const [gateBusy, setGateBusy] = useState(false)

  useEffect(() => {
    if (token || !runId) return
    fetch(`/api/chat/${runId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.publicAccessToken) setToken(data.publicAccessToken)
      })
      .catch(() => {})
  }, [runId, token])

  const { run, error } = useRealtimeRun(triggerRunId ?? undefined, {
    accessToken: token ?? undefined,
    enabled: Boolean(triggerRunId && token),
  })

  const meta = (run?.metadata ?? {}) as Record<string, unknown>
  const stage = (meta.stage as string) ?? 'plan'
  const gate = meta.gate as GateMeta | undefined
  const done = meta.done as { storyId?: string; costActual?: number } | undefined
  const err = meta.error as { code?: string; balance?: number } | undefined

  const onGate = useCallback(
    async (approved: boolean) => {
      setGateBusy(true)
      try {
        const res = await fetch(`/api/chat/${runId}/gate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Gate request failed')
        }
      } finally {
        setGateBusy(false)
      }
    },
    [runId],
  )

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Production run</h1>
        <p className="mt-1 text-sm text-muted-foreground font-mono">{runId}</p>
      </div>

      <StageRail stage={stage} />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Realtime error: {error.message}
        </div>
      )}

      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          {err.code === 'insufficient_credits'
            ? `Insufficient credits (balance: ${err.balance ?? '?'})`
            : JSON.stringify(err)}
        </div>
      )}

      {gate && stage === 'gate' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <h2 className="text-lg font-medium">Approve generation</h2>
          <p className="text-sm text-muted-foreground">
            Estimated cost: <span className="font-semibold text-foreground">{gate.estimate} credits</span>
          </p>
          {gate.plan?.scenes && (
            <ul className="space-y-2 text-sm">
              {gate.plan.scenes.map((s) => (
                <li key={s.id} className="rounded-lg bg-[var(--surface2)] px-3 py-2">
                  <span className="font-medium">{s.sentence}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-3">
            <Button disabled={gateBusy} onClick={() => onGate(true)}>
              Approve & generate
            </Button>
            <Button variant="outline" disabled={gateBusy} onClick={() => onGate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {done && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h2 className="text-lg font-medium text-foreground">Run complete</h2>
          <p className="text-sm text-muted-foreground">
            Spent {done.costActual ?? '?'} credits
          </p>
          {(done.storyId ?? storyId) && (
            <Button
              onClick={() => router.push(`/dashboard/story/${done.storyId ?? storyId}`)}
            >
              Open story
            </Button>
          )}
        </div>
      )}

      {!triggerRunId && (
        <p className="text-sm text-muted-foreground">Waiting for worker…</p>
      )}
    </div>
  )
}

function StageRail({ stage }: { stage: string }) {
  const idx = STAGES.indexOf(stage as (typeof STAGES)[number])
  return (
    <ol className="flex flex-wrap gap-2">
      {STAGES.map((s, i) => (
        <li
          key={s}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium capitalize',
            i <= idx
              ? 'bg-foreground text-background'
              : 'bg-[var(--surface2)] text-muted-foreground',
          )}
        >
          {s}
        </li>
      ))}
    </ol>
  )
}
