'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '../drawers/Drawer'
import { useWorkspace } from '@/context/workspace-context'
import { updateThumbnail } from '@/lib/storage'

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
      updateThumbnail(storyId, data.url)
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
    <Drawer open={open} onClose={onClose} title="Thumbnail" placement="top-right">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Thumbnail" style={{ width: '100%', borderRadius: 10, marginBottom: 12 }} />
      ) : (
        <div style={{ aspectRatio: '16/9', borderRadius: 10, background: 'var(--surface2)', display: 'grid', placeItems: 'center', color: 'var(--muted)', marginBottom: 12 }}>
          No thumbnail yet
        </div>
      )}

      {prompt && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Prompt</span>
            <button className="icon-btn" style={{ height: 22, padding: '0 6px', fontSize: '0.7rem' }} onClick={copy}>
              <Copy size={11} />
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text)', background: 'var(--surface2)', padding: 10, borderRadius: 8 }}>
            {prompt}
          </div>
        </div>
      )}

      <button
        className="icon-btn icon-btn--primary"
        onClick={generate}
        disabled={busy || readOnly || !prompt}
        style={{ width: '100%', justifyContent: 'center', height: 38 }}
      >
        {busy ? <RefreshCw size={14} className="animate-spin" /> : url ? <RefreshCw size={14} /> : <Sparkles size={14} />}
        {busy ? 'Generating…' : url ? 'Regenerate' : 'Generate'}
      </button>
    </Drawer>
  )
}
