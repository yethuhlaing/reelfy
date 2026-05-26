'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, Music, Search, X } from 'lucide-react'
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
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

const DEFAULT_VISUAL_MODEL = 'flux-schnell-fal'
const LOFI_STOCK_OPTIONS_STORAGE_KEY = 'new-lofi-stock:options'
const DEFAULT_DURATION_SEC = 3600

const VISUAL_COUNT_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: String(n) }
})

const CURATED_CATEGORIES = [
  { id: 'cfdfdd53-195a-6b6c-bc54-d665859b445b', name: 'Lofi' },
  { id: '91ca6cf0-08d4-0e57-e024-2fd0e1413327', name: 'Chill' },
  { id: 'b5bc7541-bdc2-d42a-3986-572fddd29753', name: 'Ambient' },
  { id: '871f1ab8-d0f4-0573-8e22-9e995cf4fd6f', name: 'Relaxing' },
  { id: '78b17c21-bfb1-90ae-5240-e59d82c5ef3a', name: 'Calm' },
  { id: '6f0fe64f-5795-2876-6fd3-cdaedda1634f', name: 'Aesthetic' },
  { id: '6c8635a6-8f38-924f-b6ac-c1a8a609e84d', name: 'Vlog' },
  { id: '93371cc5-be9f-fe83-a6e6-42735fa551b8', name: 'Peaceful' },
  { id: '212dbef5-8532-f318-8c4a-f3f2dde20e8a', name: 'Meditative' },
  { id: 'b85381db-9105-41aa-2ca0-0aa1c9a80223', name: 'Electronic' },
  { id: '8a9ec7d9-4a38-ad1c-4d45-0421efb81c9d', name: 'Upbeat' },
  { id: 'f96cc1c5-9172-b0e2-6c63-eb3f3eff5598', name: 'Cinematic' },
]

type Tab = 'popular' | 'new' | 'staff' | 'random'

const TABS: { value: Tab; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'new', label: 'New' },
  { value: 'staff', label: 'Staff Picks' },
  { value: 'random', label: 'Random' },
]

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
  const [balance, setBalance] = useState<number | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('popular')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [browseTracks, setBrowseTracks] = useState<FreetouseTrack[]>([])
  const [browseOffset, setBrowseOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isBrowseLoading, setIsBrowseLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FreetouseTrack[]>([])
  const [searchOffset, setSearchOffset] = useState(0)
  const [searchHasMore, setSearchHasMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const [selectedTracks, setSelectedTracks] = useState<FreetouseTrack[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
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

  const loadBrowseTracks = useCallback(async (
    tab: Tab,
    category: string | null,
    offset: number,
    append: boolean,
  ) => {
    setIsBrowseLoading(true)
    try {
      const params = new URLSearchParams({ tab, limit: '20', offset: String(offset) })
      if (category) params.set('category', category)
      const res = await fetch(`/api/lofi-stock/search?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load tracks')
      const data = await res.json() as { tracks: FreetouseTrack[]; hasMore: boolean }
      setBrowseTracks((prev) => append ? [...prev, ...data.tracks] : data.tracks)
      setHasMore(data.hasMore)
      setBrowseOffset(offset + data.tracks.length)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not load tracks.'))
    } finally {
      setIsBrowseLoading(false)
    }
  }, [])

  // Reload on tab or category change (skip when in search mode)
  useEffect(() => {
    setBrowseTracks([])
    setBrowseOffset(0)
    loadBrowseTracks(activeTab, activeCategory, 0, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeCategory])

  const doSearch = useCallback(async (query: string, offset: number, append: boolean) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchOffset(0)
      setSearchHasMore(false)
      return
    }
    setIsSearching(true)
    try {
      const params = new URLSearchParams({ q: query, limit: '20', offset: String(offset) })
      const res = await fetch(`/api/lofi-stock/search?${params.toString()}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json() as { tracks: FreetouseTrack[]; hasMore: boolean }
      setSearchResults((prev) => append ? [...prev, ...data.tracks] : data.tracks)
      setSearchHasMore(data.hasMore)
      setSearchOffset(offset + data.tracks.length)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not search for tracks.'))
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!value.trim()) {
      setSearchResults([])
      setSearchOffset(0)
      setSearchHasMore(false)
      return
    }
    searchTimeout.current = setTimeout(() => doSearch(value, 0, false), 400)
  }, [doSearch])

  const handlePlay = useCallback((track: FreetouseTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    audioRef.current?.pause()
    const audio = new Audio(track.files.mp3)
    audio.volume = 0.5
    audioRef.current = audio
    setPlayingId(track.id)
    audio.play().catch(() => {})
    audio.addEventListener('ended', () => setPlayingId(null))
  }, [playingId])

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  const toggleTrack = useCallback((track: FreetouseTrack) => {
    setSelectedTracks((prev) => {
      const exists = prev.find((t) => t.id === track.id)
      if (exists) return prev.filter((t) => t.id !== track.id)
      return [...prev, track]
    })
  }, [])

  const isTrackSelected = useCallback(
    (id: string) => selectedTracks.some((t) => t.id === id),
    [selectedTracks],
  )

  const removeTrack = useCallback((id: string) => {
    setSelectedTracks((prev) => prev.filter((t) => t.id !== id))
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
    }
  }, [playingId])

  const expandBody = () => ({
    vibe: vibe.trim(),
    targetDurationSec: duration,
    textModel,
    targetMusicCount: 1,
    targetVisualCount: phase === 'editing' ? editedVisualPrompts.length : visualCount,
  })

  const handleExpand = async () => {
    const trimmed = vibe.trim()
    if (trimmed.length < 10) { toast.error('Vibe needs at least 10 characters.'); return }
    if (selectedTracks.length === 0) { toast.error('Select at least one music track.'); return }
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
      const result = await res.json() as ExpandResult
      setExpandResult(result)
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
      const result = await res.json() as ExpandResult
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
      const result = await res.json() as ExpandResult
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

    const trackRefs = selectedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      mp3Url: t.files.mp3,
      duration_sec: t.duration,
      genre: t.genre,
      artist_name: (t.artists[0] as [number, { name: string }] | undefined)?.[1]?.name,
    }))

    try {
      const res = await fetch('/api/lofi-stock/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe: vibe.trim(),
          targetDurationSec: duration,
          selectedTracks: trackRefs,
          visualConfig: { mode: visualMode, model: visualModel, assets },
          visualPrompts: editedVisualPrompts,
          suggestedTitle: expandResult.suggestedTitle,
          suggestedAmbientBed: expandResult.suggestedAmbientBed,
        }),
      })
      const data = await res.json() as { videoId?: string; storyId?: string; error?: string }
      if (!res.ok || !data.videoId) throw new Error(data.error ?? 'Failed to generate video')
      toast.success('Generation started!')
      router.push(`/lofi-stock/story/${data.videoId}`)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not start generation. Please try again.'))
      setPhase('editing')
    }
  }

  const isInSearchMode = !!searchQuery.trim()
  const displayTracks = isInSearchMode ? searchResults : browseTracks
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

      {/* Music browser */}
      <div className="flex flex-col gap-3">
        <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Browse Free To Use Stock Music
        </label>

        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-9 pr-9 font-[var(--font-body)] text-[0.95rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px]"
            placeholder="Search by title, artist, or mood…"
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            disabled={phase === 'submitting'}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
              onClick={() => handleSearchInputChange('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tabs (browse mode only) */}
        {!isInSearchMode && (
          <div className="flex gap-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition ${
                  activeTab === tab.value
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
                }`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Category chips (browse mode only) */}
        {!isInSearchMode && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`rounded-full border px-2.5 py-1 text-[0.72rem] transition ${
                activeCategory === null
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
              }`}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {CURATED_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`rounded-full border px-2.5 py-1 text-[0.72rem] transition ${
                  activeCategory === cat.id
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
                }`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Initial loading spinner */}
        {(isBrowseLoading || isSearching) && displayTracks.length === 0 && (
          <div className="flex items-center gap-2 py-6 text-[0.8rem] text-[var(--muted)]">
            <Loader2 size={14} className="animate-spin" />
            Loading tracks…
          </div>
        )}

        {/* Track list */}
        {displayTracks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {displayTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isSelected={isTrackSelected(track.id)}
                isPlaying={playingId === track.id}
                onToggle={() => toggleTrack(track)}
                onPlay={() => handlePlay(track)}
              />
            ))}
          </div>
        )}

        {/* Empty search state */}
        {!isSearching && isInSearchMode && searchResults.length === 0 && searchQuery && (
          <div className="py-4 text-[0.8rem] text-[var(--muted)]">
            No tracks found for &quot;{searchQuery}&quot;
          </div>
        )}

        {/* Load more */}
        {!isInSearchMode && hasMore && !isBrowseLoading && (
          <button
            type="button"
            className="mt-1 self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[0.75rem] text-[var(--text)] transition hover:bg-[var(--surface2)]"
            onClick={() => loadBrowseTracks(activeTab, activeCategory, browseOffset, true)}
          >
            Load more
          </button>
        )}
        {isInSearchMode && searchHasMore && !isSearching && (
          <button
            type="button"
            className="mt-1 self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[0.75rem] text-[var(--text)] transition hover:bg-[var(--surface2)]"
            onClick={() => doSearch(searchQuery, searchOffset, true)}
          >
            Load more
          </button>
        )}
        {(isBrowseLoading || isSearching) && displayTracks.length > 0 && (
          <div className="flex items-center gap-2 py-2 text-[0.8rem] text-[var(--muted)]">
            <Loader2 size={14} className="animate-spin" />
            Loading…
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

      {/* Editing phase */}
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
                  const result = await res.json() as ExpandResult
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
            musicModel="freetouse"
            musicLoopCount={selectedTracks.length}
            visualModel={visualModel}
            visualAssetCount={editedVisualPrompts.length}
            balance={balance}
          />

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[0.75rem] text-[var(--muted)]">
            Music from{' '}
            <a
              href="https://freetouse.com/music"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--text)]"
            >
              Free To Use (freetouse.com)
            </a>
            {' '}— free for personal use, commercial use requires a{' '}
            <a
              href="https://freetouse.com/music/plans"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--text)]"
            >
              paid license
            </a>.
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
  isPlaying,
  onToggle,
  onPlay,
}: {
  track: FreetouseTrack
  isSelected: boolean
  isPlaying: boolean
  onToggle: () => void
  onPlay: () => void
}) {
  const artistEntry = track.artists[0] as [number, { name: string }] | undefined
  const artistName = artistEntry?.[1]?.name
  const categoryEntry = track.categories[0] as [number, { name: string }] | undefined
  const categoryName = categoryEntry?.[1]?.name
  const durationSec = Math.round(track.duration)
  const durationStr =
    durationSec < 60
      ? `${durationSec}s`
      : `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}`

  // Sample waveform to 80 bars
  const waveform = track.waveform
  const BAR_COUNT = 80
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const idx = Math.floor((i / BAR_COUNT) * waveform.length)
    return waveform[idx] ?? 0
  })
  const maxBar = Math.max(...bars, 1)

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        isSelected
          ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))]'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
      }`}
    >
      {/* Cover art */}
      {track.thumbnails.sm && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={track.thumbnails.sm}
          alt={track.title}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      )}

      {/* Info + waveform */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[0.85rem] font-medium text-[var(--text)]">
            {track.title}
          </span>
          {categoryName && (
            <span className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[0.65rem] text-[var(--muted)]">
              {categoryName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[0.7rem] text-[var(--muted)]">
          {artistName && <span>{artistName}</span>}
          <span>{durationStr}</span>
          <span>{track.downloads.toLocaleString()} downloads</span>
        </div>
        {/* Static waveform */}
        <div className="flex h-4 items-end gap-[1px] overflow-hidden">
          {bars.map((v, i) => (
            <div
              key={i}
              className={`flex-1 rounded-[1px] transition-opacity ${
                isSelected ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
              }`}
              style={{
                height: `${Math.max(8, (v / maxBar) * 100)}%`,
                opacity: isPlaying ? 1 : 0.35,
              }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[0.75rem] text-[var(--muted)] transition hover:bg-[var(--surface2)]"
          onClick={onPlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
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
  track: FreetouseTrack
  onRemove: () => void
}) {
  const artistEntry = track.artists[0] as [number, { name: string }] | undefined
  const artistName = artistEntry?.[1]?.name
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] px-3 py-1.5">
      <Music size={12} className="text-[var(--accent)]" />
      <span className="text-[0.75rem] text-[var(--text)]">
        {track.title}{artistName ? ` — ${artistName}` : ''}
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
              className={`w-full cursor-pointer rounded-[5px] border border-transparent bg-transparent px-[7px] py-[5px] text-left font-inherit text-[0.74rem] leading-[1.2] text-[var(--text)] hover:bg-[var(--surface2)] ${
                current === opt.value
                  ? 'border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[color-mix(in_srgb,var(--surface2)_75%,var(--accent)_25%)]'
                  : ''
              }`}
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
