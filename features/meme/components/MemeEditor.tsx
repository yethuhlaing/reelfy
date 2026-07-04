'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CaseUpper,
  Download,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type {
  MemeBoxAlign,
  MemeBoxStyle,
  MemeRenderBox,
  MemeVariant,
} from '@/shared/lib/types'
import { MemePreview } from './MemePreview'

const TEXT_SAVE_DEBOUNCE_MS = 1000

/** Style presets the user can switch between (kept in sync with box-style.ts). */
const STYLE_OPTIONS: { value: MemeBoxStyle; label: string }[] = [
  { value: 'impact-outline', label: 'Impact' },
  { value: 'plain-white', label: 'White' },
  { value: 'plain-black', label: 'Black' },
  { value: 'label-white', label: 'Label' },
]

/** Fonts registered in the server renderer (features/meme/server/fonts.ts). */
const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Anton', label: 'Anton' },
  { value: 'Inter', label: 'Inter' },
]

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
  // Set when an edit arrives while a save is in flight, so we re-save the
  // latest boxes once the current request finishes (avoids losing edits).
  const pendingSave = useRef(false)

  boxesRef.current = boxes
  renderedUrlRef.current = renderedUrl

  // Only reset local state when the user actually switches to a *different*
  // variant. The save round-trip mutates the `variant` prop (same templateId);
  // resetting on that echo would clobber in-progress edits and make styles
  // appear to revert.
  useEffect(() => {
    setBoxes(variant.boxes)
    setRenderedUrl(variant.renderedUrl)
    setSelected(variant.boxes[0]?.index ?? null)
    dirtyRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.templateId])

  const persistVariant = useCallback(
    async (nextBoxes: MemeRenderBox[]): Promise<MemeVariant | null> => {
      // A save is already running — remember to flush the latest edits after it.
      if (saveInFlight.current) {
        pendingSave.current = true
        return saveInFlight.current
      }

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
      const result = await task
      // Edits landed while this request was in flight — save the newest boxes.
      if (pendingSave.current) {
        pendingSave.current = false
        return persistVariant(boxesRef.current)
      }
      return result
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

  const updateBox = useCallback(
    (index: number, patch: Partial<MemeRenderBox>, persist: 'none' | 'debounced') => {
      setBoxes((prev) => {
        const next = prev.map((b) => (b.index === index ? { ...b, ...patch } : b))
        boxesRef.current = next
        return next
      })
      dirtyRef.current = true
      if (persist === 'debounced') scheduleTextSave()
    },
    [scheduleTextSave],
  )

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

  const selectedBox = boxes.find((b) => b.index === selected) ?? null

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Bare canvas — no card box, so the meme fills the space and edits feel direct. */}
      <div className="flex items-start justify-center">
        <div className="w-full max-w-xl">
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

        <div className="glass-panel flex flex-col gap-2 p-4">
          <h3 className="text-sm font-semibold">Captions</h3>
          {boxes.map((box) => (
            <button
              key={box.index}
              type="button"
              onClick={() => setSelected(box.index)}
              className={`flex flex-col gap-1 rounded-md border p-2 text-left transition ${
                selected === box.index
                  ? 'border-[var(--accent)] bg-[var(--surface2)]'
                  : 'border-[var(--border)] hover:border-[var(--accent)]'
              }`}
            >
              <span className="text-xs text-[var(--muted)]">Box {box.index + 1}</span>
              <textarea
                value={box.text}
                onChange={(e) => updateBox(box.index, { text: e.target.value }, 'debounced')}
                onFocus={() => setSelected(box.index)}
                rows={2}
                maxLength={box.maxChars}
                className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              />
            </button>
          ))}
          <p className="text-[0.7rem] text-[var(--muted)]">
            Click a caption or the meme to select. Drag to move, corner handles to resize.
          </p>
        </div>

        {selectedBox && (
          <BoxToolbar
            box={selectedBox}
            onPatch={(patch) => updateBox(selectedBox.index, patch, 'none')}
            onCommit={() => void persistVariant(boxesRef.current)}
          />
        )}

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

/** Formatting controls for the currently-selected caption box. */
function BoxToolbar({
  box,
  onPatch,
  onCommit,
}: {
  box: MemeRenderBox
  onPatch: (patch: Partial<MemeRenderBox>) => void
  onCommit: () => void
}) {
  // Live font-size % (0 means "auto-fit"). Preview updates as the slider moves;
  // we only persist (re-render) on release.
  const sizePct = box.fontSizePct ?? 0

  return (
    <div className="glass-panel flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Style · Box {box.index + 1}</h3>
        <button
          type="button"
          onClick={() => {
            onPatch({
              color: undefined,
              strokeColor: undefined,
              fontFamily: undefined,
              fontSizePct: undefined,
            })
            onCommit()
          }}
          className="inline-flex items-center gap-1 text-[0.7rem] text-[var(--muted)] hover:underline"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {/* Preset */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--muted)]">Preset</span>
        <div className="grid grid-cols-4 gap-1">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onPatch({ style: opt.value })
                onCommit()
              }}
              className={`rounded-md border px-2 py-1 text-xs transition ${
                box.style === opt.value
                  ? 'border-[var(--accent)] bg-[var(--surface2)] font-semibold'
                  : 'border-[var(--border)] hover:border-[var(--accent)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </label>

      {/* Font */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--muted)]">Font</span>
        <div className="grid grid-cols-2 gap-1">
          {FONT_OPTIONS.map((opt) => {
            const active = (box.fontFamily ?? '').startsWith(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onPatch({ fontFamily: opt.value })
                  onCommit()
                }}
                className={`rounded-md border px-2 py-1 text-xs transition ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--surface2)] font-semibold'
                    : 'border-[var(--border)] hover:border-[var(--accent)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </label>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Text"
          value={box.color ?? '#ffffff'}
          onChange={(v) => onPatch({ color: v })}
          onCommit={onCommit}
        />
        <ColorField
          label="Stroke"
          value={box.strokeColor ?? '#000000'}
          onChange={(v) => onPatch({ strokeColor: v })}
          onCommit={onCommit}
        />
      </div>

      {/* Alignment + uppercase */}
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
          {(
            [
              ['left', AlignLeft],
              ['center', AlignCenter],
              ['right', AlignRight],
            ] as const
          ).map(([align, Icon]) => (
            <button
              key={align}
              type="button"
              onClick={() => {
                onPatch({ align: align as MemeBoxAlign })
                onCommit()
              }}
              className={`p-1.5 transition ${
                box.align === align
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'hover:bg-[var(--surface2)]'
              }`}
              aria-label={`Align ${align}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            onPatch({ uppercase: !box.uppercase })
            onCommit()
          }}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition ${
            box.uppercase
              ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
              : 'border-[var(--border)] hover:border-[var(--accent)]'
          }`}
          aria-pressed={box.uppercase ?? false}
        >
          <CaseUpper className="h-4 w-4" /> Caps
        </button>
      </div>

      {/* Font size */}
      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Font size</span>
          <span>{sizePct === 0 ? 'Auto' : `${sizePct}%`}</span>
        </span>
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={sizePct}
          onChange={(e) => {
            const v = Number(e.target.value)
            onPatch({ fontSizePct: v === 0 ? undefined : v })
          }}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
          className="w-full accent-[var(--accent)]"
        />
      </label>
    </div>
  )
}

/** A swatch + hex input pair that shares one value. */
function ColorField({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onCommit: () => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          spellCheck={false}
          className="w-full min-w-0 bg-transparent text-xs uppercase outline-none"
        />
      </div>
    </label>
  )
}
