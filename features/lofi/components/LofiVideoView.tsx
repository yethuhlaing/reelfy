'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Download, XCircle, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { LofiProgress } from './LofiProgress'
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
}

interface VideoStatusResponse {
  id: string
  storyId: string
  status: string
  vibe: string
  targetDurationSec: number
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

export function LofiVideoView({ id, category }: { id: string; category?: string }) {
  const router = useRouter()
  const [data, setData] = useState<VideoStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

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
      setLoading(false)
      setError(null)
      return json
    } catch (err) {
      if (!loading) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
      setLoading(false)
      return null
    }
  }, [id, loading])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (!data) return
    const terminal = ['complete', 'failed', 'aborted']
    if (terminal.includes(data.status)) return

    const interval = setInterval(async () => {
      const result = await fetchStatus()
      if (result && terminal.includes(result.status)) {
        clearInterval(interval)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [data?.status, fetchStatus])

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
        const msg = (await res.json().catch(() => ({})) as { error?: string }).error ?? 'Retry failed'
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          ◈ {isStock ? 'lofi-stock' : 'lofi'}
        </span>
        <h1 className="mt-2" style={{ fontSize: '1.2rem' }}>
          {data.vibe.slice(0, 60)}
        </h1>
        <span className="text-[0.75rem] text-[var(--muted)]">
          {data.status} · {Math.floor(data.targetDurationSec / 60)}min
        </span>
      </div>

      {isActive && (
        <div className="flex flex-col gap-4">
          <LofiProgress
            musicReady={progress.musicReady}
            musicTotal={progress.musicTotal}
            visualReady={progress.visualReady}
            visualTotal={progress.visualTotal}
            status={data.status}
          />
          <button
            className="inline-flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[0.85rem] text-[var(--text)] hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleCancel}
            disabled={cancelling}
          >
            <XCircle size={16} />
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      )}

      {isComplete && data.finalVideoUrl && (
        <div className="flex flex-col gap-4">
          <video
            controls
            className="w-full rounded-xl border border-[var(--border)]"
            style={{ aspectRatio: '16/9' }}
          >
            <source src={data.finalVideoUrl} type="video/mp4" />
          </video>
          <div className="flex gap-2">
            <a
              href={data.finalVideoUrl}
              download={`${slugify(data.vibe)}.mp4`}
              className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[0.85rem] text-[var(--text)] no-underline hover:bg-[var(--surface2)]"
            >
              <Download size={16} /> Download
            </a>
            <button
              className="inline-flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[0.85rem] text-[var(--text)] hover:bg-[var(--surface2)]"
              onClick={() => router.push(`/${isStock ? 'lofi-stock' : 'lofi'}/new`)}
            >
              <RefreshCw size={16} /> Generate similar
            </button>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_18%,var(--surface))] px-3.5 py-2.5 text-[0.85rem] text-[var(--text)]">
            <AlertCircle size={16} />
            <span>Generation failed</span>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[0.85rem] text-[var(--text)] hover:bg-[var(--surface2)]"
              onClick={handleRetryRender}
            >
              <RefreshCw size={16} /> Retry render
            </button>
            <DeleteVideoDialog onDelete={handleDelete} />
          </div>
        </div>
      )}

      {isAborted && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[0.85rem] text-[var(--muted)]">
            <XCircle size={16} />
            <span>Cancelled by user</span>
          </div>
          <DeleteVideoDialog onDelete={handleDelete} />
        </div>
      )}
    </div>
  )
}

function DeleteVideoDialog({ onDelete }: { onDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="inline-flex h-[38px] w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--danger)] bg-transparent px-4 text-[0.85rem] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_15%,transparent)]">
          <Trash2 size={16} /> Delete
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
