'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, Music, Search } from 'lucide-react'
import { toast } from 'sonner'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import {
  DURATION_OPTIONS,
  VISUAL_MODEL_OPTIONS,
} from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_OPTIONS, DEFAULT_TEXT_MODEL } from '@/shared/lib/text-model-options'
import { LofiCostPreview } from '@/features/lofi/components/LofiCostPreview'
import { LofiPromptList } from '@/features/lofi/components/LofiPromptList'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import type { TextModel, VisualMode, VisualAsset } from '@/shared/lib/types'
import type { PixabayTrack } from '@/shared/lib/providers/audio/music-pixabay'

const DEFAULT_VISUAL_MODEL = 'flux-schnell-fal'
const LOFI_STOCK_OPTIONS_STORAGE_KEY = 'new-lofi-stock:options'
const DEFAULT_DURATION_SEC = 3600

const VISUAL_COUNT_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: String(n) }
})

interface ExpandResult {
  visualPrompts: string[]
  visualMode: VisualMode
  suggestedTitle: string
  suggestedAmbientBed: string | null
}

export function LofiStockForm() {
  const router = useRouter()

  const [vibe, setVibe] = useState('')
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_SEC)
  const [visualCount, setVisualCount] = useState(4)
  const [visualModel, setVisualModel] = useState(DEFAULT_VISUAL_MODEL)
  const [textModel, setTextModel] = useState<TextModel>(DEFAULT_TEXT_MODEL)

  const [phase, setPhase] = useState<'idle' | 'expanding' | 'editing' | 'submitting'>('idle')
  const [expandResult, setExpandResult] = useState<ExpandResult | null>(null)
  const [editedVisualPrompts, setEditedVisualPrompts] = useState<string[]>([])
  const [selectedTracks, setSelectedTracks] = useState<PixabayTrack[]>([])
  const [balance, setBalance] = useState<number | null>(null)

  // Track search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PixabayTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOFI_STOCK_OPTIONS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { textModel?: TextModel }
      if (parsed.textModel && TEXT_MODEL_OPTIONS.some((o) => o.value === parsed.textModel)) {
        setTextModel(parsed.textModel)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LOFI_STOCK_OPTIONS_STORAGE_KEY, JSON.stringify({ textModel }))
    } catch { /* ignore */ }
  }, [textModel])

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json() as { credits?: number }
        setBalance(data.credits ?? null)
      }
    } catch { /* ignore */ }
  }, [])

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/lofi-stock/search?q=${encodeURIComponent(query)}&per_page=10`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Search failed')
      }
      const data = await res.json() as { hits: PixabayTrack[] }
      setSearchResults(data.hits)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not search for tracks. Please try again.'))
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => handleSearch(value), 400)
  }, [handleSearch])

  const toggleTrack = useCallback((track: PixabayTrack) => {
    setSelectedTracks(prev => {
      const exists = prev.find(t => t.id === track.id)
      if (exists) return prev.filter(t => t.id !== track.id)
      return [...prev, track]
    })
  }, [])

  const isTrackSelected = useCallback((trackId: number) => {
    return selectedTracks.some(t => t.id === trackId)
  }, [selectedTracks])

  const removeTrack = useCallback((trackId: number) => {
    setSelectedTracks(prev => prev.filter(t => t.id !== trackId))
  }, [])

  const expandBody = () => ({
    vibe: vibe.trim(),
    targetDurationSec: duration,
    textModel,
    targetMusicCount: 1,
    targetVisualCount: phase === 'editing' ? editedVisualPrompts.length : visualCount,
  })

  const handleExpand = async () => {
    const trimmed = vibe.trim()
    if (trimmed.length < 10) {
      toast.error('Vibe needs at least 10 characters.')
      return
    }
    if (selectedTracks.length === 0) {
      toast.error('Select at least one music track.')
      return
    }
    setPhase('expanding')

    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody()),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to expand prompts')
      }

      const result = (await res.json()) as ExpandResult
      setExpandResult(result)
      // Keep only visual prompts, music prompts are replaced by stock tracks
      setEditedVisualPrompts([...result.visualPrompts])
      setPhase('editing')
      fetchBalance()
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not generate prompts. Please try again.'))
      setPhase('idle')
    }
  }

  const handleRegenerateVisual = async (index: number) => {
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expandBody(), targetMusicCount: 1, targetVisualCount: 1 }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to regenerate prompt')
      }
      const result = (await res.json()) as ExpandResult
      const updated = [...editedVisualPrompts]
      updated[index] = result.visualPrompts[0] ?? ''
      setEditedVisualPrompts(updated)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not regenerate that prompt. Please try again.'))
    }
  }

  const handleAddVisual = async () => {
    const insertIndex = editedVisualPrompts.length
    setEditedVisualPrompts((prev) => [...prev, ''])
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody()),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to add prompt')
      }
      const result = (await res.json()) as ExpandResult
      setEditedVisualPrompts((prev) => {
        const updated = [...prev]
        updated[insertIndex] = result.visualPrompts[0] ?? ''
        return updated
      })
    } catch (err) {
      setEditedVisualPrompts((prev) => prev.filter((_, i) => i !== insertIndex))
      toast.error(toUserErrorMessage(err, 'Could not add that prompt. Please try again.'))
    }
  }

  const handleSubmit = async () => {
    if (!expandResult) return
    setPhase('submitting')

    const visualMode = expandResult.visualMode
    const assets: VisualAsset[] = editedVisualPrompts.map((prompt, i) => ({
      prompt,
      durationSec: calcVisualDuration(i, visualMode, editedVisualPrompts.length, duration),
    }))

    try {
      const res = await fetch('/api/lofi-stock/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe: vibe.trim(),
          targetDurationSec: duration,
          selectedTracks,
          visualConfig: {
            mode: visualMode,
            model: visualModel,
            assets,
          },
          visualPrompts: editedVisualPrompts,
          suggestedTitle: expandResult.suggestedTitle,
          suggestedAmbientBed: expandResult.suggestedAmbientBed,
        }),
      })

      const data = await res.json() as { videoId?: string; storyId?: string; error?: string }

      if (!res.ok || !data.videoId) {
        throw new Error(data.error ?? 'Failed to generate video')
      }

      toast.success('Generation started!')
      router.push(`/lofi-stock/story/${data.videoId}`)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not start generation. Please try again.'))
      setPhase('editing')
    }
  }

  const isSingle = expandResult
    ? expandResult.visualMode === 'single-image' || expandResult.visualMode === 'single-video'
    : false

  const displayedVisualCount = phase === 'editing' ? editedVisualPrompts.length : visualCount

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[18px] px-6 pb-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          ◈ lofi-stock
        </span>
        <h1 style={{ marginTop: 10 }}>New lofi-stock video</h1>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="vibe" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Vibe
        </label>
        <textarea
          id="vibe"
          className="min-h-[80px] resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 font-[var(--font-body)] text-[0.95rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px]"
          placeholder="rainy tokyo café after midnight — mellow keys, soft vinyl crackle, distant espresso hiss"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          disabled={phase === 'expanding' || phase === 'submitting'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <ConfigPill
          label="Duration"
          value={DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? `${Math.round(duration / 60)}min`}
          options={DURATION_OPTIONS.map((d) => ({ value: String(d.value), label: d.label }))}
          current={String(duration)}
          onChange={(v) => setDuration(Number(v))}
          disabled={phase !== 'idle'}
        />

        <ConfigPill
          label="Script"
          value={TEXT_MODEL_OPTIONS.find((m) => m.value === textModel)?.label ?? textModel}
          options={TEXT_MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
          current={textModel}
          onChange={(v) => setTextModel(v as TextModel)}
          disabled={phase !== 'idle'}
        />

        <ConfigPill
          label="Visual model"
          value={VISUAL_MODEL_OPTIONS.find((m) => m.value === visualModel)?.label ?? visualModel}
          options={VISUAL_MODEL_OPTIONS}
          current={visualModel}
          onChange={setVisualModel}
          disabled={phase !== 'idle'}
        />

        <ConfigPill
          label="Visuals"
          value={String(displayedVisualCount)}
          options={VISUAL_COUNT_OPTIONS}
          current={String(displayedVisualCount)}
          onChange={(v) => setVisualCount(Number(v))}
          disabled={phase !== 'idle'}
        />
      </div>

      {/* Stock music browser */}
      <div className="flex flex-col gap-2">
        <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Browse Pixabay Stock Music
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-9 pr-4 font-[var(--font-body)] text-[0.95rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px]"
            placeholder="Search for music (e.g. lofi, chill, jazz, ambient)"
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            disabled={phase === 'submitting'}
          />
        </div>

        {isSearching && (
          <div className="flex items-center gap-2 py-4 text-[0.8rem] text-[var(--muted)]">
            <Loader2 size={14} className="animate-spin" />
            Searching Pixabay...
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {searchResults.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isSelected={isTrackSelected(track.id)}
                onToggle={() => toggleTrack(track)}
              />
            ))}
          </div>
        )}

        {!isSearching && searchQuery && searchResults.length === 0 && (
          <div className="py-4 text-[0.8rem] text-[var(--muted)]">
            No tracks found for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {/* Selected tracks */}
      {selectedTracks.length > 0 && (
        <div className="flex flex-col gap-2">
          <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Selected tracks ({selectedTracks.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedTracks.map((track) => (
              <SelectedTrackChip
                key={track.id}
                track={track}
                onRemove={() => removeTrack(track.id)}
              />
            ))}
          </div>
        </div>
      )}

      {phase === 'editing' && expandResult && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 text-[0.75rem] text-[var(--accent)] hover:underline"
              onClick={async () => {
                try {
                  const res = await fetch('/api/lofi/expand-prompts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expandBody()),
                  })
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({})) as { error?: string }
                    throw new Error(data.error ?? 'Failed to expand prompts')
                  }
                  const result = (await res.json()) as ExpandResult
                  setExpandResult(result)
                  setEditedVisualPrompts(result.visualPrompts)
                } catch (err) {
                  toast.error(toUserErrorMessage(err, 'Could not regenerate prompts. Please try again.'))
                }
              }}
            >
              <Sparkles size={13} /> Regenerate all
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[0.85rem] font-semibold text-[var(--text)]">
                Visual prompts ({editedVisualPrompts.length})
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.68rem] text-[var(--muted)]">
                {expandResult.visualMode}
              </span>
            </div>
            <LofiPromptList
              prompts={editedVisualPrompts}
              onChange={(i, v) => {
                const updated = [...editedVisualPrompts]
                updated[i] = v
                setEditedVisualPrompts(updated)
              }}
              onRegenerate={handleRegenerateVisual}
              onRemove={(i) => setEditedVisualPrompts(editedVisualPrompts.filter((_, idx) => idx !== i))}
              onAdd={editedVisualPrompts.length < 12 ? handleAddVisual : undefined}
            />
            {!isSingle && (
              <div className="mt-2 text-[0.75rem] text-[var(--muted)]">
                Total visual duration:{' '}
                {editedVisualPrompts.reduce(
                  (sum, _, i) =>
                    sum + calcVisualDuration(i, expandResult.visualMode, editedVisualPrompts.length, duration),
                  0,
                )}
                s = target {Math.round(duration / 60)}min {editedVisualPrompts.length > 0 ? '✓' : ''}
              </div>
            )}
          </div>

          <LofiCostPreview
            musicModel="pixabay"
            musicLoopCount={selectedTracks.length}
            visualModel={visualModel}
            visualAssetCount={editedVisualPrompts.length}
            balance={balance}
          />

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[0.75rem] text-[var(--muted)]">
            Music from Pixabay (CC0-style, no attribution required)
          </div>
        </div>
      )}

      <div className="min-h-6" />

      <button
        className="inline-flex h-[46px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={phase === 'editing' ? handleSubmit : handleExpand}
        disabled={
          phase === 'expanding' ||
          phase === 'submitting' ||
          (phase === 'idle' && (!vibe.trim() || selectedTracks.length === 0))
        }
      >
        {phase === 'expanding' || phase === 'submitting' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} />
        )}
        {phase === 'expanding'
          ? 'Expanding...'
          : phase === 'submitting'
            ? 'Generating...'
            : phase === 'editing'
              ? 'Generate Video'
              : 'Expand Prompts →'}
      </button>
    </div>
  )
}

function TrackCard({
  track,
  isSelected,
  onToggle,
}: {
  track: PixabayTrack
  isSelected: boolean
  onToggle: () => void
}) {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePreview = () => {
    if (isPreviewPlaying) {
      audioRef.current?.pause()
      setIsPreviewPlaying(false)
      return
    }
    if (!track.url) return
    const audio = new Audio(track.url)
    audio.volume = 0.5
    audioRef.current = audio
    audio.play().catch(() => {
      // Preview playback may fail due to CORS or other issues
    })
    setIsPreviewPlaying(true)
    audio.addEventListener('ended', () => setIsPreviewPlaying(false))
    // Auto-stop after 30 seconds
    setTimeout(() => {
      audio.pause()
      setIsPreviewPlaying(false)
    }, 30000)
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`
    const mins = Math.floor(sec / 60)
    const remainingSec = sec % 60
    return `${mins}:${remainingSec.toString().padStart(2, '0')}`
  }

  const genre = track.genre
  const artist = track.artist_name

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
        isSelected
          ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))]'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-4">
        <div className="flex items-center gap-2">
          <Music size={14} className="shrink-0 text-[var(--muted)]" />
          <span className="truncate text-[0.85rem] font-medium text-[var(--text)]">
            {track.tags.split(', ').slice(0, 3).join(', ')}
          </span>
          {genre && (
            <span className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[0.65rem] text-[var(--muted)]">
              {genre}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[0.7rem] text-[var(--muted)]">
          {artist && <span>{artist}</span>}
          <span>{formatDuration(track.duration)}</span>
          <span>{track.downloads.toLocaleString()} downloads</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[0.75rem] text-[var(--muted)] transition hover:bg-[var(--surface2)]"
          onClick={handlePreview}
          title={isPreviewPlaying ? 'Stop preview' : 'Play preview (30s)'}
        >
          {isPreviewPlaying ? '⏹' : '▶'}
        </button>
        <button
          type="button"
          className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition ${
            isSelected
              ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
          }`}
          onClick={onToggle}
        >
          {isSelected ? '✓ Added' : 'Add'}
        </button>
      </div>
    </div>
  )
}

function SelectedTrackChip({
  track,
  onRemove,
}: {
  track: PixabayTrack
  onRemove: () => void
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] px-3 py-1.5">
      <Music size={12} className="text-[var(--accent)]" />
      <span className="text-[0.75rem] text-[var(--text)]">
        {track.tags.split(', ').slice(0, 2).join(', ')}
      </span>
      <button
        type="button"
        className="ml-1 cursor-pointer text-[var(--muted)] hover:text-[var(--text)]"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  )
}

function calcVisualDuration(
  index: number,
  mode: VisualMode,
  total: number,
  targetDurationSec: number,
): number {
  if (mode === 'single-image' || mode === 'single-video') return targetDurationSec
  const perAsset = Math.floor(targetDurationSec / total)
  const remainder = targetDurationSec - perAsset * total
  return perAsset + (index === total - 1 ? remainder : 0)
}

function ConfigPill({
  label,
  value,
  current,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string
  current: string
  options: { value: string; label: string }[]
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-inherit text-[var(--text)] transition hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          <span className="text-[0.68rem] text-[var(--muted)]">{label}</span>
          <span className="text-[0.72rem]">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-1.5">
        <div className="flex max-h-[190px] flex-col gap-px overflow-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full cursor-pointer rounded-[5px] border border-transparent bg-transparent px-[7px] py-[5px] text-left font-inherit text-[0.74rem] leading-[1.2] text-[var(--text)] hover:bg-[var(--surface2)] ${current === opt.value ? 'border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[color-mix(in_srgb,var(--surface2)_75%,var(--accent)_25%)]' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
