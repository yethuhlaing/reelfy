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
      <div className="thumbnail-slot thumbnail-filled">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Cover" className="thumbnail-image" />
        <button
          className="thumbnail-regen-btn"
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
      <div className="thumbnail-slot thumbnail-generating">
        <div className="thumbnail-skeleton">
          <span className="thumbnail-spinner" />
          <span className="thumbnail-label">Generating cover…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="thumbnail-slot thumbnail-empty">
      {error ? (
        <div className="thumbnail-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Retry</button>
        </div>
      ) : (
        <button className="thumbnail-generate-btn" onClick={handleGenerate}>
          Generate Cover
        </button>
      )}
    </div>
  )
}