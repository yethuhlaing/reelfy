'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type { MemeRenderBox, MemeVariant } from '@/shared/lib/types'
import { MemePreview } from './MemePreview'

const TEXT_SAVE_DEBOUNCE_MS = 1000

export function MemeEditor({
  generationId,
  variant,
  onBack,
  backLabel = '← Pick a different variant',
  onVariantUpdate,
}: {
  generationId: string
  variant: MemeVariant
  onBack: () => void
  backLabel?: string
  onVariantUpdate: (variant: MemeVariant) => void
}) {
  const [boxes, setBoxes] = useState<MemeRenderBox[]>(variant.boxes)
  const [selected, setSelected] = useState<number | null>(boxes[0]?.index ?? null)
  const [downloading, setDownloading] = useState(false)
  const [renderedUrl, setRenderedUrl] = useState(variant.renderedUrl)

  const boxesRef = useRef(boxes)
  const renderedUrlRef = useRef(renderedUrl)
  const dirtyRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlight = useRef<Promise<MemeVariant | null> | null>(null)

  boxesRef.current = boxes
  renderedUrlRef.current = renderedUrl

  useEffect(() => {
    setBoxes(variant.boxes)
    setRenderedUrl(variant.renderedUrl)
    dirtyRef.current = false
  }, [variant])

  const persistVariant = useCallback(
    async (nextBoxes: MemeRenderBox[]): Promise<MemeVariant | null> => {
      if (saveInFlight.current) return saveInFlight.current

      const task = (async () => {
        try {
          const res = await fetch('/api/meme/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              generationId,
              templateId: variant.templateId,
              boxes: nextBoxes,
            }),
          })
          const data = (await res.json()) as { variant?: MemeVariant; error?: string }
          if (!res.ok || !data.variant) throw new Error(data.error ?? 'Failed to save meme')
          setRenderedUrl(data.variant.renderedUrl)
          renderedUrlRef.current = data.variant.renderedUrl
          onVariantUpdate(data.variant)
          dirtyRef.current = false
          return data.variant
        } catch (err) {
          toast.error(toUserErrorMessage(err, 'Could not save changes.'))
          return null
        } finally {
          saveInFlight.current = null
        }
      })()

      saveInFlight.current = task
      return task
    },
    [generationId, onVariantUpdate, variant.templateId],
  )

  const scheduleTextSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    dirtyRef.current = true
    saveTimer.current = setTimeout(() => {
      void persistVariant(boxesRef.current)
    }, TEXT_SAVE_DEBOUNCE_MS)
  }, [persistVariant])

  const flushSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (saveInFlight.current) {
      const saved = await saveInFlight.current
      return saved?.renderedUrl ?? renderedUrlRef.current
    }
    if (!dirtyRef.current) return renderedUrlRef.current
    const saved = await persistVariant(boxesRef.current)
    return saved?.renderedUrl ?? renderedUrlRef.current
  }, [persistVariant])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const updateBox = (index: number, patch: Partial<MemeRenderBox>, persist: 'none' | 'debounced') => {
    setBoxes((prev) => {
      const next = prev.map((b) => (b.index === index ? { ...b, ...patch } : b))
      boxesRef.current = next
      return next
    })
    dirtyRef.current = true
    if (persist === 'debounced') scheduleTextSave()
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = await flushSave()
      if (!url) return
      const a = document.createElement('a')
      a.href = url
      a.download = `meme-${variant.templateId}.png`
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="glass-panel flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <MemePreview
            imageUrl={variant.imageUrl}
            width={variant.width}
            height={variant.height}
            boxes={boxes}
            editable
            selectedIndex={selected}
            onSelectBox={setSelected}
            onMoveBox={(index, xPct, yPct) => updateBox(index, { xPct, yPct }, 'none')}
            onResizeBox={(index, xPct, yPct, wPct, hPct) =>
              updateBox(index, { xPct, yPct, wPct, hPct }, 'none')
            }
            onEditEnd={() => void persistVariant(boxesRef.current)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="self-start text-sm text-[var(--muted)] hover:underline">
          {backLabel}
        </button>

        <div className="glass-panel flex flex-col gap-3 p-4">
          <h3 className="text-sm font-semibold">Captions</h3>
          {boxes.map((box) => (
            <label key={box.index} className="flex flex-col gap-1">
              <span className="text-xs text-[var(--muted)]">Box {box.index + 1}</span>
              <textarea
                value={box.text}
                onChange={(e) => updateBox(box.index, { text: e.target.value }, 'debounced')}
                onFocus={() => setSelected(box.index)}
                rows={2}
                maxLength={box.maxChars}
                className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              />
            </label>
          ))}
          <p className="text-[0.7rem] text-[var(--muted)]">
            Drag captions to move. Drag corner handles to resize.
          </p>
        </div>

        <div className="glass-panel p-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PNG
          </button>
        </div>
      </div>
    </div>
  )
}
