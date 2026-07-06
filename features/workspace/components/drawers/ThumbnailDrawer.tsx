'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from './Drawer'
import { useWorkspace } from '@/features/workspace/context/workspace-context'

interface Props {
  open: boolean
  onClose: () => void
}

export function ThumbnailDrawer({ open, onClose }: Props) {
  const { storyId, storyData, setStoryData, readOnly } = useWorkspace()
  const [busy, setBusy] = useState(false)

  const prompt = storyData?.thumbnailPrompt ?? null
  const url = storyData?.thumbnailUrl ?? null

  const generate = async () => {
    if (!storyId || !prompt || !storyData) return
    setBusy(true)
    try {
      const res = await fetch('/api/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          prompt,
          title: storyData.title,
          tagline: storyData.tagline,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { url: string }
      setStoryData((prev) => (prev ? { ...prev, thumbnailUrl: data.url } : prev))
      toast.success('Thumbnail ready')
    } catch (err) {
      toast.error('Thumbnail failed', { description: err instanceof Error ? err.message : 'Try again' })
    } finally {
      setBusy(false)
    }
  }

  const copy = () => {
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    toast.success('Prompt copied')
  }

  return (
    <Drawer open={open} onClose={onClose} title="Thumbnail" placement="right">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Thumbnail" className="mb-3 block w-full rounded-[10px]" />
      ) : (
        <div className="mb-3 grid aspect-video place-items-center rounded-[10px] bg-[var(--surface2)] text-[var(--muted)]">
          No thumbnail yet
        </div>
      )}

      {prompt && (
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1.5 text-[0.72rem] text-[var(--muted)]">
            <span>Prompt</span>
            <button
              className="inline-flex h-[22px] min-w-[22px] items-center justify-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface2)] px-1.5 text-[0.7rem] text-[var(--text)]"
              onClick={copy}
            >
              <Copy size={11} />
            </button>
          </div>
          <div className="rounded-lg bg-[var(--surface2)] p-2.5 text-[0.8rem] text-[var(--text)]">
            {prompt}
          </div>
        </div>
      )}

      <button
        className="inline-flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={generate}
        disabled={busy || readOnly || !prompt}
      >
        {busy ? <RefreshCw size={14} className="animate-spin" /> : url ? <RefreshCw size={14} /> : <Sparkles size={14} />}
        {busy ? 'Generating…' : url ? 'Regenerate' : 'Generate'}
      </button>
    </Drawer>
  )
}
