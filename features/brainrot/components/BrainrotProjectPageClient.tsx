'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Captions,
  Clapperboard,
  Clock,
  Download,
  ExternalLink,
  Gamepad2,
  Loader2,
  Mic,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrainrotProject } from '@/shared/lib/types/brainrot'
import type {
  BrainrotExportHydration,
  BrainrotExportPhase,
} from '@/features/brainrot/lib/brainrot-export-view'
import { getGameplayCategory } from '@/shared/data/gameplay-catalog'
import { brainrotVoiceOverride } from '@/shared/data/brainrot-voices'

// Turn raw provider/job errors (e.g. 'terminated', 'ERROR') into something a user
// can read. Keeps genuine, human-readable messages as-is.
function friendlyError(raw?: string): string {
  if (!raw) return 'Render failed. Try generating again.'
  const low = raw.toLowerCase()
  if (low === 'terminated' || low === 'error' || low === 'failed') {
    return 'The render was interrupted. Try generating again.'
  }
  return raw
}

function statusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case 'complete':
      return { label: 'Ready', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' }
    case 'rendering':
      return { label: 'Rendering', className: 'border-amber-500/40 bg-amber-500/10 text-amber-400' }
    case 'draft':
    case 'script_ready':
      return { label: 'Draft', className: 'border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]' }
    default:
      return { label: 'Failed', className: 'border-red-500/40 bg-red-500/10 text-red-400' }
  }
}

const PHASE_COPY: Record<BrainrotExportPhase, { title: string; detail: string }> = {
  composing: {
    title: 'Compositing reel…',
    detail: 'Laying gameplay under your voiceover.',
  },
  subtitling: {
    title: 'Adding captions…',
    detail: 'Burning word-by-word captions onto the reel.',
  },
}

function formatDuration(sec: number | null): string | null {
  if (!sec || sec <= 0) return null
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function titleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Mic; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-[0.8rem] text-[var(--muted)]">
        <Icon size={14} className="shrink-0" /> {label}
      </span>
      <span className="truncate text-[0.82rem] font-medium text-[var(--text)]">{value}</span>
    </div>
  )
}

type StreamEvent = {
  status: string
  videoUrl?: string
  error?: string
  phase?: BrainrotExportPhase | null
}

const RECONNECT_DELAY_MS = 1200

export function BrainrotProjectPageClient({
  project: initial,
  exportRun,
}: {
  project: BrainrotProject
  exportRun: BrainrotExportHydration | null
}) {
  const router = useRouter()

  const [project, setProject] = useState(initial)
  // Seeded from the server's reconciled Run, so a reload mid-export shows the
  // phase it is actually in rather than waiting for the first stream message.
  const [rendering, setRendering] = useState(exportRun?.status === 'running')
  const [phase, setPhase] = useState<BrainrotExportPhase | null>(exportRun?.phase ?? null)
  const [error, setError] = useState<string | null>(
    exportRun?.status === 'failed' ? friendlyError(exportRun.error) : null,
  )
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const esRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppedRef = useRef(false)

  const closeStream = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /**
   * Re-get the project from the server. This is the answer to a dropped
   * stream: the Run lives on the Target, so the server can always say where
   * the export got to — the client never has to guess, or time out into a lie.
   */
  const reget = useCallback(async (): Promise<'running' | 'done' | 'failed' | 'idle'> => {
    const res = await fetch(`/api/brainrot/${initial.id}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Re-get failed')
    const data = (await res.json()) as {
      project: BrainrotProject
      exportRun: BrainrotExportHydration | null
    }
    setProject(data.project)

    if (data.exportRun?.status === 'running') {
      setPhase(data.exportRun.phase)
      return 'running'
    }
    if (data.exportRun?.status === 'failed') {
      setError(friendlyError(data.exportRun.error))
      setRendering(false)
      setPhase(null)
      return 'failed'
    }
    setRendering(false)
    setPhase(null)
    return data.project.outputVideoUrl ? 'done' : 'idle'
  }, [initial.id])

  const watch = useCallback(() => {
    closeStream()
    if (stoppedRef.current) return

    const es = new EventSource(`/api/brainrot/${initial.id}/stream`)
    esRef.current = es

    const stop = () => {
      es.close()
      if (esRef.current === es) esRef.current = null
    }

    es.onmessage = (event) => {
      let data: StreamEvent
      try {
        data = JSON.parse(event.data as string) as StreamEvent
      } catch {
        return
      }

      if (data.status === 'done' && data.videoUrl) {
        setProject((p) => ({ ...p, status: 'complete', outputVideoUrl: data.videoUrl! }))
        setRendering(false)
        setPhase(null)
        setError(null)
        stop()
        router.refresh()
      } else if (data.status === 'failed') {
        setError(friendlyError(data.error))
        setRendering(false)
        setPhase(null)
        setProject((p) => ({ ...p, status: 'failed' }))
        stop()
      } else if (data.status === 'aborted' || data.status === 'idle') {
        setRendering(false)
        setPhase(null)
        stop()
        void reget().catch(() => {})
      } else if (data.status === 'reconnect') {
        // The server closed a long-lived stream on purpose; pick it straight up.
        stop()
        timerRef.current = setTimeout(watch, 100)
      } else if (data.status === 'progress') {
        setPhase(data.phase ?? null)
      }
    }

    es.onerror = () => {
      stop()
      if (stoppedRef.current) return
      // A dropped stream is not a failed export. Ask the server; only stop
      // spinning when it says the Run is actually over.
      void reget()
        .then((outcome) => {
          if (stoppedRef.current) return
          if (outcome === 'running') timerRef.current = setTimeout(watch, RECONNECT_DELAY_MS)
        })
        .catch(() => {
          if (!stoppedRef.current) timerRef.current = setTimeout(watch, RECONNECT_DELAY_MS)
        })
    }
  }, [closeStream, initial.id, reget, router])

  useEffect(() => {
    stoppedRef.current = false
    if (!rendering) return
    watch()
    return () => {
      stoppedRef.current = true
      closeStream()
    }
  }, [rendering, watch, closeStream])

  const handleDelete = useCallback(async () => {
    const res = await fetch(`/api/brainrot/${project.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Delete failed')
      return
    }
    toast.success('Deleted')
    router.push('/dashboard')
    router.refresh()
  }, [project.id, router])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    try {
      const res = await fetch(`/api/brainrot/${project.id}/retry`, { method: 'POST' })
      const data = (await res.json()) as { status?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Retry failed')
      setError(null)
      setPhase(null)
      setProject((p) => ({ ...p, status: 'rendering' }))
      setRendering(true)
      toast.success('Picking the render back up…')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetrying(false)
    }
  }, [project.id])

  const handleCancel = useCallback(async () => {
    setCancelling(true)
    try {
      const res = await fetch(`/api/brainrot/${project.id}/cancel`, { method: 'POST' })
      if (!res.ok) throw new Error('Cancel failed')
      stoppedRef.current = true
      closeStream()
      setRendering(false)
      setPhase(null)
      setProject((p) => ({ ...p, status: p.script ? 'script_ready' : 'draft' }))
      toast.success('Render cancelled')
      router.refresh()
    } catch {
      toast.error('Cancel failed')
    } finally {
      setCancelling(false)
    }
  }, [closeStream, project.id, router])

  const title = project.title || project.inputText.slice(0, 48) || 'Brainrot reel'
  const isFailed = !rendering && !project.outputVideoUrl && project.status === 'failed'
  const status = statusMeta(rendering ? 'rendering' : project.status)
  const phaseCopy = PHASE_COPY[phase ?? 'composing']

  const categoryLabel =
    getGameplayCategory(project.backgroundCategory)?.label ??
    (project.backgroundCategory ? titleCase(project.backgroundCategory) : null)
  const voiceLabel =
    brainrotVoiceOverride(project.characterVoiceId)?.label ??
    (project.characterVoiceId ? 'AI voice' : null)
  const duration = formatDuration(project.voiceoverDurationSec)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* Breadcrumb / back */}
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="mb-5 inline-flex items-center gap-1.5 text-[0.8rem] text-[var(--muted)] transition hover:text-[var(--text)]"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[0.68rem] font-medium text-[var(--muted)]">
              ▶ Brainrot
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${status.className}`}>
              {status.label}
            </span>
          </div>
          <h1 className="truncate font-[var(--font-heading)] text-2xl font-semibold">{title}</h1>
        </div>
        <button
          type="button"
          onClick={() => void handleDelete()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)] transition hover:border-red-500/40 hover:text-red-400"
          aria-label="Delete reel"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
        {/* Video / player column */}
        <div className="mx-auto w-full max-w-[320px] lg:mx-0">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-black shadow-[0_20px_60px_-24px_rgba(0,0,0,0.7)]">
            {rendering && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 text-white">
                <Loader2 className="size-8 animate-spin text-[var(--accent)]" />
                <p className="text-sm">{phaseCopy.title}</p>
                <p className="max-w-[200px] text-center text-xs text-white/50">
                  {phaseCopy.detail}
                </p>
              </div>
            )}
            {project.outputVideoUrl ? (
              <video
                key={project.outputVideoUrl}
                src={project.outputVideoUrl}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              !rendering && (
                <div className="flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
                  {isFailed ? (
                    <>
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-red-500/10">
                        <AlertTriangle className="size-6 text-red-400" />
                      </div>
                      <p className="text-sm font-medium text-red-400">Render failed</p>
                      <p className="text-xs leading-relaxed text-white/50">
                        {error ?? 'Something went wrong while rendering.'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-white/40">No video yet</p>
                  )}
                </div>
              )
            )}
          </div>

          {rendering && (
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-60"
            >
              <X size={15} /> {cancelling ? 'Cancelling…' : 'Cancel render'}
            </button>
          )}

          {/* Primary actions under the player */}
          {project.outputVideoUrl && !rendering && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={project.outputVideoUrl}
                download
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[var(--accent-ink,#fff)] transition hover:opacity-90"
              >
                <Download size={15} /> Download
              </a>
              <a
                href={project.outputVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--border-strong)]"
              >
                <ExternalLink size={15} /> New tab
              </a>
            </div>
          )}

          {isFailed && (
            <button
              type="button"
              onClick={() => void handleRetry()}
              disabled={retrying}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink,#fff)] transition hover:opacity-90 disabled:opacity-60"
            >
              <RotateCcw size={15} /> {retrying ? 'Retrying…' : 'Retry render'}
            </button>
          )}
        </div>

        {/* Details column */}
        <div className="flex flex-col gap-4">
          {(categoryLabel || voiceLabel || project.format || duration) && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2">
              <div className="divide-y divide-[var(--border)]">
                {categoryLabel && <MetaRow icon={Gamepad2} label="Gameplay" value={categoryLabel} />}
                {voiceLabel && <MetaRow icon={Mic} label="Voice" value={voiceLabel} />}
                {project.format && <MetaRow icon={Clapperboard} label="Format" value={titleCase(project.format)} />}
                <MetaRow icon={Captions} label="Captions" value={titleCase(project.captionPosition)} />
                {duration && <MetaRow icon={Clock} label="Duration" value={duration} />}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Script
            </p>
            <p className="whitespace-pre-wrap text-[0.9rem] leading-relaxed text-[var(--text)]/85">
              {project.script || project.inputText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
