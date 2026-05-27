'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  AlertCircle,
  Download,
  XCircle,
  RefreshCw,
  Trash2,
  Clock,
  ListMusic,
  ImageIcon,
  Film,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { LofiProgress } from './LofiProgress'
import { LofiStockRecomposePanel } from './LofiStockRecomposePanel'
import { SoundtrackPanel } from './SoundtrackPanel'
import { VisualGalleryViewer } from './VisualGalleryViewer'
import { AudioPlayerProvider } from '@/shared/ui/audio-player'
import { formatMmSs } from '@/features/lofi-stock/lib/playlist-utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'

interface AssetStatus {
  id: string
  kind: 'music' | 'stock-music' | 'visual'
  orderIndex: number
  status: string
  resultUrl: string | null
  retryCount: number
  prompt: string
  model: string
  durationSec: number
  sourceTrackId?: string | null
}

interface VideoStatusResponse {
  id: string
  storyId: string
  status: string
  vibe: string
  targetDurationSec: number
  musicModel: string
  musicLoopCount: number
  visualMode: string
  imageModel: string | null
  videoModel: string | null
  finalVideoUrl: string | null
  arrangementJson: string | null
  assets: AssetStatus[]
  progress?: {
    musicReady: number
    musicTotal: number
    visualReady: number
    visualTotal: number
    overallPct: number
  }
}

const STATUS_META: Record<
  string,
  { label: string; tone: 'accent' | 'success' | 'danger' | 'muted' }
> = {
  generating: { label: 'Generating', tone: 'accent' },
  gating: { label: 'Arranging', tone: 'accent' },
  rendering: { label: 'Rendering', tone: 'accent' },
  complete: { label: 'Complete', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  aborted: { label: 'Cancelled', tone: 'muted' },
}

function computeProgressFromAssets(assets: AssetStatus[]) {
  const music = assets.filter((a) => a.kind === 'music' || a.kind === 'stock-music')
  const visual = assets.filter((a) => a.kind === 'visual')
  const musicReady = music.filter((a) => a.status === 'ready').length
  const visualReady = visual.filter((a) => a.status === 'ready').length
  const total = music.length + visual.length
  const ready = musicReady + visualReady
  return {
    musicReady,
    musicTotal: music.length,
    visualReady,
    visualTotal: visual.length,
    overallPct: total > 0 ? Math.round((ready / total) * 100) : 0,
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'muted' as const }
  const toneClass =
    meta.tone === 'accent'
      ? 'border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-[var(--accent)]'
      : meta.tone === 'success'
        ? 'border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] text-[var(--success)]'
        : meta.tone === 'danger'
          ? 'border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] text-[var(--danger)]'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide ${toneClass}`}
    >
      {meta.tone === 'accent' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {meta.label}
    </span>
  )
}

function MetaChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.72rem] text-[var(--muted)]">
      <Icon size={11} className="shrink-0 opacity-70" />
      {children}
    </span>
  )
}

function DashboardCard({
  title,
  icon: Icon,
  badge,
  children,
  className = '',
}: {
  title: string
  icon: LucideIcon
  badge?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`card-gradient-border glass flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <Icon size={15} className="text-[var(--accent)]" />
        <h2 className="text-[0.78rem] font-semibold uppercase tracking-wider text-[var(--text)]">
          {title}
        </h2>
        {badge && (
          <span className="ml-auto text-[0.68rem] tabular-nums text-[var(--muted)]">{badge}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </section>
  )
}

export function LofiVideoView({ id, category }: { id: string; category?: string }) {
  const router = useRouter()
  const [data, setData] = useState<VideoStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const initialLoadRef = useRef(true)

  const resolvedCategory = category ?? 'lofi'
  const isStock = resolvedCategory === 'lofi-stock'

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/lofi/videos/${id}`, { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 404) {
          setError('Video not found')
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const json = (await res.json()) as VideoStatusResponse
      setData(json)
      initialLoadRef.current = false
      setLoading(false)
      setError(null)
      return json
    } catch (err) {
      if (!initialLoadRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
      initialLoadRef.current = false
      setLoading(false)
      return null
    }
  }, [id])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (!data) return
    const terminal = ['complete', 'failed', 'aborted']
    if (terminal.includes(data.status)) return

    const es = new EventSource(`/api/lofi/videos/${id}/stream`)

    es.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data as string) as Partial<VideoStatusResponse> & {
          finalVideoUrl?: string
          ts?: number
          done?: number
          total?: number
        }
        if (update.status) {
          setData((prev) => (prev ? { ...prev, ...update } : prev))
          if (terminal.includes(update.status!)) {
            es.close()
            fetchStatus()
          } else if (update.done !== undefined) {
            fetchStatus()
          }
        }
      } catch {
        /* ignore parse errors */
      }
    }

    es.onerror = () => es.close()

    return () => es.close()
  }, [data?.status, id, fetchStatus])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await fetch(`/api/lofi/videos/${id}/cancel`, { method: 'POST' })
      toast.success('Cancelled')
      setData((prev) => (prev ? { ...prev, status: 'aborted' } : prev))
    } catch {
      toast.error('Failed to cancel')
    }
    setCancelling(false)
  }

  const handleRetryRender = async () => {
    try {
      const res = await fetch(`/api/lofi/videos/${id}/retry-render`, { method: 'POST' })
      if (!res.ok) {
        const msg =
          ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Retry failed'
        throw new Error(msg)
      }
      toast.success('Retrying render...')
      setData((prev) => (prev ? { ...prev, status: 'rendering' } : prev))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed')
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/lofi/videos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Deleted')
        router.push('/dashboard')
      } else {
        throw new Error('Delete failed')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
        <div className="flex items-center gap-2 text-[var(--danger)]">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const isActive = ['generating', 'gating', 'rendering'].includes(data.status)
  const isComplete = data.status === 'complete'
  const isFailed = data.status === 'failed'
  const isAborted = data.status === 'aborted'
  const progress = data.progress ?? computeProgressFromAssets(data.assets)
  const isTerminal = isComplete || isFailed || isAborted
  const visualModel = data.imageModel ?? data.videoModel ?? 'flux-schnell-fal'

  const musicAssets = data.assets
    .filter((a) => a.kind === 'music' || a.kind === 'stock-music')
    .sort((a, b) => a.orderIndex - b.orderIndex)
  const visualAssets = data.assets
    .filter((a) => a.kind === 'visual')
    .sort((a, b) => a.orderIndex - b.orderIndex)
  const totalMusicSec = musicAssets.reduce((sum, a) => sum + a.durationSec, 0)

  return (
    <AudioPlayerProvider>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 pb-28 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.68rem] font-semibold text-[var(--text)]">
                ◈ {isStock ? 'lofi-stock' : 'lofi'}
              </span>
              <StatusBadge status={data.status} />
            </div>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-[1.35rem] font-semibold leading-snug tracking-tight text-[var(--text)] sm:text-[1.5rem]">
              {data.vibe}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <MetaChip icon={Clock}>
                {Math.floor(data.targetDurationSec / 60)} min target
              </MetaChip>
              {musicAssets.length > 0 && (
                <MetaChip icon={ListMusic}>
                  {musicAssets.length} {musicAssets.length === 1 ? 'track' : 'tracks'}
                  {totalMusicSec > 0 && ` · ${formatMmSs(totalMusicSec)}`}
                </MetaChip>
              )}
              {visualAssets.length > 0 && (
                <MetaChip icon={ImageIcon}>
                  {visualAssets.length} {visualAssets.length === 1 ? 'scene' : 'scenes'}
                </MetaChip>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isComplete && data.finalVideoUrl && (
              <a
                href={data.finalVideoUrl}
                download={`${slugify(data.vibe)}.mp4`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[0.78rem] text-[var(--text)] no-underline hover:bg-[var(--surface2)]"
              >
                <Download size={14} /> Download
              </a>
            )}
            <DeleteVideoDialog onDelete={handleDelete} />
          </div>
        </header>

        {isActive && (
          <DashboardCard title="Progress" icon={Activity}>
            <div className="flex flex-col gap-4">
              <LofiProgress
                musicReady={progress.musicReady}
                musicTotal={progress.musicTotal}
                visualReady={progress.visualReady}
                visualTotal={progress.visualTotal}
                status={data.status}
              />
              <button
                className="inline-flex h-9 w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 text-[0.8rem] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleCancel}
                disabled={cancelling}
              >
                <XCircle size={15} />
                {cancelling ? 'Cancelling…' : 'Cancel generation'}
              </button>
            </div>
          </DashboardCard>
        )}

        {isComplete && data.finalVideoUrl && (
          <div className="card-gradient-border glass overflow-hidden rounded-2xl border border-[var(--border)]">
            <video
              controls
              className="w-full bg-black"
              style={{ aspectRatio: '16/9' }}
            >
              <source src={data.finalVideoUrl} type="video/mp4" />
            </video>
            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] p-4">
              <button
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[0.8rem] text-[var(--text)] hover:bg-[var(--surface2)]"
                onClick={() => router.push(`/${isStock ? 'lofi-stock' : 'lofi'}/new`)}
              >
                <RefreshCw size={14} /> Generate similar
              </button>
            </div>
          </div>
        )}

        {isFailed && (
          <FailurePanel
            assets={data.assets}
            arrangementJson={data.arrangementJson}
            onRetry={handleRetryRender}
          />
        )}

        {isAborted && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[0.8rem] text-[var(--muted)]">
            <XCircle size={15} className="shrink-0" />
            <span>Generation was cancelled. Assets below are preserved — edit and recompose when ready.</span>
          </div>
        )}

        {(musicAssets.length > 0 || visualAssets.length > 0) && (
          <LofiAssetPanel
            musicAssets={musicAssets}
            visualAssets={visualAssets}
            isStock={isStock}
          />
        )}

        {isTerminal && (
          <LofiStockRecomposePanel
            videoId={id}
            isStock={isStock}
            assets={data.assets}
            vibe={data.vibe}
            targetDurationSec={data.targetDurationSec}
            visualMode={data.visualMode}
            visualModel={visualModel}
            musicModel={data.musicModel}
            onRecomposed={fetchStatus}
          />
        )}
      </div>
    </AudioPlayerProvider>
  )
}

function FailurePanel({
  assets,
  arrangementJson,
  onRetry,
}: {
  assets: AssetStatus[]
  arrangementJson: string | null
  onRetry: () => void
}) {
  const music = assets.filter((a) => a.kind === 'music' || a.kind === 'stock-music')
  const visual = assets.filter((a) => a.kind === 'visual')
  const musicReady = music.filter((a) => a.status === 'ready' || a.status === 'skipped').length
  const visualReady = visual.filter((a) => a.status === 'ready' || a.status === 'skipped').length
  const assetsAllReady =
    music.length > 0 && musicReady === music.length && visualReady === visual.length

  let headline: string
  let detail: string
  let retryLabel: string
  let retryable = true

  if (!assetsAllReady && assets.length > 0) {
    headline = 'Asset generation failed'
    detail = `Music ${musicReady}/${music.length} ready · Visuals ${visualReady}/${visual.length} ready`
    retryLabel = 'Retry render with ready assets'
  } else if (assetsAllReady && !arrangementJson) {
    headline = 'Could not arrange tracks'
    detail = 'All assets generated but arrangement planning failed'
    retryLabel = 'Retry render'
  } else {
    headline = 'Video rendering failed'
    detail = 'Assets were ready — rendering service error'
    retryLabel = 'Retry render'
  }

  if (music.length > 0 && musicReady === 0) {
    retryable = false
    detail = 'No music tracks could be generated. Try a different vibe or track selection.'
  }

  return (
    <div className="card-gradient-border glass flex flex-col gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]">
          <AlertCircle size={16} />
        </div>
        <div>
          <p className="text-[0.9rem] font-semibold text-[var(--text)]">{headline}</p>
          <p className="mt-1 text-[0.78rem] text-[var(--muted)]">{detail}</p>
        </div>
      </div>
      {retryable && (
        <button
          className="inline-flex h-9 w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[0.8rem] text-[var(--text)] hover:bg-[var(--surface2)]"
          onClick={onRetry}
        >
          <RefreshCw size={14} /> {retryLabel}
        </button>
      )}
    </div>
  )
}

function DeleteVideoDialog({ onDelete }: { onDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-transparent px-3 text-[0.78rem] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]">
          <Trash2 size={14} /> Delete
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="gap-0 border-[var(--border)] bg-[var(--surface-solid)] p-0 shadow-2xl sm:max-w-md">
        <div className="space-y-4 px-6 pt-6 pb-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]">
              <Trash2 size={18} />
            </div>
            <AlertDialogHeader className="gap-1 text-left">
              <AlertDialogTitle className="text-base text-[var(--text)]">
                Delete this video?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[var(--muted)]">
                This will permanently remove the video and all assets.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
        </div>
        <AlertDialogFooter className="border-t border-[var(--border)] px-6 py-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-[var(--danger)] text-white hover:brightness-110"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function LofiAssetPanel({
  musicAssets,
  visualAssets,
  isStock,
}: {
  musicAssets: AssetStatus[]
  visualAssets: AssetStatus[]
  isStock: boolean
}) {
  const showTracks = musicAssets.length > 0
  const showVisuals = visualAssets.length > 0

  if (!showTracks && !showVisuals) return null

  return (
    <div
      className={`grid gap-4 ${
        showTracks && showVisuals
          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start'
          : 'grid-cols-1'
      }`}
    >
      {showVisuals && (
        <DashboardCard
          title="Visuals"
          icon={Film}
          badge={`${visualAssets.length} ${visualAssets.length === 1 ? 'scene' : 'scenes'}`}
        >
          <VisualGalleryViewer assets={visualAssets} />
        </DashboardCard>
      )}

      {showTracks && (
        <DashboardCard
          title={isStock ? 'Soundtrack' : 'Music loops'}
          icon={ListMusic}
          badge={formatMmSs(musicAssets.reduce((s, a) => s + a.durationSec, 0))}
          className={showVisuals ? 'lg:sticky lg:top-4' : ''}
        >
          <SoundtrackPanel assets={musicAssets} />
        </DashboardCard>
      )}
    </div>
  )
}
