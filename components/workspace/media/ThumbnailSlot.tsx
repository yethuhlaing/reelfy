'use client'

import { useState } from 'react'

interface ThumbnailSlotProps {
  storyId: string | null
  prompt: string | null
  title?: string | null
  tagline?: string | null
  url: string | null
  onGenerated: (url: string) => void
}

export function ThumbnailSlot({ storyId, prompt, title, tagline, url, onGenerated }: ThumbnailSlotProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!storyId) {
    return null
  }

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Cover generation not available — re-run story')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, prompt, title, tagline }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      onGenerated(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thumbnail generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  if (url && !isGenerating) {
    return (
      <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Cover" className="block h-full w-full object-cover" />
        <button
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-black/60 text-[var(--text)] transition hover:bg-black/85"
          onClick={handleGenerate}
          disabled={isGenerating}
          title="Regenerate cover"
        >
          ↻
        </button>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface2)]">
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-[var(--muted)]">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          <span>Generating cover…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface2)]">
      {error ? (
        <div className="mt-2 text-xs text-[#ff6b6b]">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Retry</button>
        </div>
      ) : (
        <button
          className="mx-auto mt-5 rounded-md border-0 bg-[var(--accent)] px-4 py-2.5 font-[var(--font-heading)] text-sm font-semibold text-black transition hover:opacity-85"
          onClick={handleGenerate}
        >
          Generate Cover
        </button>
      )}
    </div>
  )
}