'use client'

import { Download, ExternalLink, Link2, AlertTriangle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { useExportState } from '@/features/workspace/context/export-state'

interface Props {
  videoUrl: string
  posterUrl?: string | null
  /** Epoch ms the video was rendered. */
  composedAt?: number | null
  /** True when scenes changed after the last export. */
  stale?: boolean
  storyId: string
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function ExportedVideoPanel({
  videoUrl,
  posterUrl,
  composedAt,
  stale,
  storyId,
}: Props) {
  const { openModal } = useExportState()
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)]">
        <video
          key={videoUrl}
          src={videoUrl}
          poster={posterUrl ?? undefined}
          controls
          playsInline
          className="block aspect-video w-full bg-black"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[0.82rem] text-[var(--muted)]">
          {composedAt ? <span>Exported {timeAgo(composedAt)}</span> : <span>Exported video</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={videoUrl} download={`story-${storyId}.mp4`}>
              <Download size={14} /> Download MP4
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={videoUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> Open in new tab
            </a>
          </Button>
          <Button variant="outline" onClick={copyLink}>
            <Link2 size={14} /> Copy link
          </Button>
        </div>
      </div>

      {stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface2))] px-3.5 py-3">
          <div className="flex items-start gap-2 text-[0.82rem] text-[var(--text)]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <span>Scenes changed since this export. Re-export to include the latest edits.</span>
          </div>
          <Button variant="outline" onClick={openModal} className="shrink-0">
            <RotateCcw size={14} /> Re-export
          </Button>
        </div>
      )}
    </div>
  )
}
