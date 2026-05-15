'use client'

import { useEffect, useState } from 'react'
import { getStory } from '@/lib/storage'
import type { Scene } from '@/lib/types'

interface ExportButtonProps {
  storyId: string
  scenes: Scene[]
}

export function ExportButton({ storyId, scenes }: ExportButtonProps) {
  const [composedUrl, setComposedUrl] = useState<string | null>(null)

  useEffect(() => {
    const stored = getStory(storyId)
    setComposedUrl(stored?.composedVideoUrl ?? null)
  }, [storyId])

  void scenes

  return (
    <div className="export-slot">
      {composedUrl && (
        <a
          href={composedUrl}
          download={`story-${storyId}.mp4`}
          className="export-download-btn"
        >
          ↓ Download MP4
        </a>
      )}
      <button
        className="export-btn"
        disabled
        title="Compose pending — migrating to fal.ai queue"
      >
        ⬇ Export MP4
      </button>
    </div>
  )
}
