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
  kind: 'music' | 'visual'
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
  progress: {
    musicReady: number
    musicTotal: number
    visualReady: number
    visualTotal: number
    overallPct: number
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export function LofiVideoView({ id }: { id: string }) {
  const router = useRouter()
  const [data, setData] = useState<VideoStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          ◈ lofi
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
            musicReady={data.progress.musicReady}
            musicTotal={data.progress.musicTotal}
            visualReady={data.progress.visualReady}
            visualTotal={data.progress.visualTotal}
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
              onClick={() => router.push('/lofi/new')}
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="inline-flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--danger)] bg-transparent px-4 text-[0.85rem] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_15%,transparent)]">
                  <Trash2 size={16} /> Delete
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this video?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the video and all assets.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-[var(--danger)] text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {isAborted && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[0.85rem] text-[var(--muted)]">
            <XCircle size={16} />
            <span>Cancelled by user</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="inline-flex h-[38px] w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--danger)] bg-transparent px-4 text-[0.85rem] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_15%,transparent)]">
                <Trash2 size={16} /> Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this video?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the video and all assets.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-[var(--danger)] text-white">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
