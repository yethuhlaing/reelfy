'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrainrotProject } from '@/shared/lib/types/brainrot'
import { BRAINROT_EXPORT_MIN_CREDITS } from '@/features/brainrot/constants'
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

export function BrainrotProjectPageClient({ project: initial }: { project: BrainrotProject }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')

  const [project, setProject] = useState(initial)
  const [rendering, setRendering] = useState(initial.status === 'rendering' || !!jobId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId || project.status === 'complete') return

    const es = new EventSource(
      `/api/brainrot/${project.id}/stream?jobId=${encodeURIComponent(jobId)}`,
    )

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { status: string; videoUrl?: string; error?: string }
        if (data.status === 'done' && data.videoUrl) {
          setProject((p) => ({ ...p, status: 'complete', outputVideoUrl: data.videoUrl! }))
          setRendering(false)
          es.close()
          router.replace(`/dashboard/brainrot/${project.id}`)
        } else if (data.status === 'failed') {
          setError(friendlyError(data.error))
          setRendering(false)
          setProject((p) => ({ ...p, status: 'failed' }))
          es.close()
        } else if (data.status === 'reconnect') {
          es.close()
        }
      } catch { /* ignore */ }
    }

    es.onerror = () => es.close()
    return () => es.close()
  }, [jobId, project.id, project.status, router])

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

  const title = project.title || project.inputText.slice(0, 48) || 'Brainrot reel'
  const isFailed = !rendering && !project.outputVideoUrl && project.status === 'failed'
  const status = statusMeta(rendering ? 'rendering' : project.status)

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
                <p className="text-sm">Rendering reel…</p>
                <p className="max-w-[200px] text-center text-xs text-white/50">
                  Compositing gameplay, voiceover and captions.
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

          {/* Primary actions under the player */}
          {project.outputVideoUrl && (
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
              onClick={() => router.push('/new?category=brainrot')}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink,#fff)] transition hover:opacity-90"
            >
              <RotateCcw size={15} /> Start a new reel · from {BRAINROT_EXPORT_MIN_CREDITS} credits
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
