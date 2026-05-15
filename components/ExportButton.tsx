'use client'

import { useEffect, useState } from 'react'
import { getStory, updateComposedVideo } from '@/lib/storage'
import type { Scene } from '@/lib/types'

interface ExportButtonProps {
  storyId: string
  scenes: Scene[]
}

export function ExportButton({ storyId, scenes }: ExportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'composing' | 'done' | 'error'>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = getStory(storyId)
    if (stored?.composedVideoUrl) {
      setVideoUrl(stored.composedVideoUrl)
      setStatus('done')
    }
  }, [storyId])

  const composable = scenes.filter((s) => s.voiceoverUrl && (s.imageUrl || s.videoUrl))

  const handleExport = async () => {
    setStatus('composing')
    setError(null)

    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          scenes: scenes.map((s) => ({
            id: s.id,
            imageUrl: s.imageUrl,
            videoUrl: s.videoUrl,
            voiceoverUrl: s.voiceoverUrl,
          })),
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Composition failed')
      }

      let url: string
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('video/mp4')) {
        // Local dev: binary response
        const blob = await res.blob()
        url = URL.createObjectURL(blob)
      } else {
        const data = (await res.json()) as { videoUrl: string }
        url = data.videoUrl
      }

      updateComposedVideo(storyId, url)
      setVideoUrl(url)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setStatus('error')
    }
  }

  if (status === 'done' && videoUrl) {
    return (
      <div className="export-result">
        <a href={videoUrl} download={`story-${storyId}.mp4`} className="export-download-btn">
          ↓ Download MP4
        </a>
        <button
          className="export-reset-btn"
          onClick={() => {
            setStatus('idle')
            setVideoUrl(null)
          }}
        >
          ↺
        </button>
      </div>
    )
  }

  return (
    <div className="export-slot">
      {status === 'error' && error && <span className="export-error">{error}</span>}
      <button
        className="export-btn"
        onClick={handleExport}
        disabled={status === 'composing' || composable.length === 0}
        title={
          composable.length === 0
            ? 'Play scenes to generate voiceovers first'
            : `Compose ${composable.length} scene${composable.length === 1 ? '' : 's'} into MP4`
        }
      >
        {status === 'composing' ? 'Composing…' : '⬇ Export MP4'}
      </button>
    </div>
  )
}
