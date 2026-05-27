'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import { TEXT_MODEL_OPTIONS, DEFAULT_TEXT_MODEL } from '@/shared/lib/text-model-options'
import { ALLOWED_DURATION_SEC, VISUAL_MODEL_OPTIONS } from '@/features/lofi/lib/pricing-constants'
import { calcVisualDuration } from '@/features/lofi/lib/visual-duration'
import { AudioPlayerProvider, useAudioPlayer } from '@/shared/ui/audio-player'
import { LofiStockStepHeader } from './LofiStockStepHeader'
import { StockTrackBrowser } from './StockTrackBrowser'
import { StockPlaylistPanel } from './StockPlaylistPanel'
import { StockSetupStep } from './StockSetupStep'
import { StockVisualsStep } from './StockVisualsStep'
import { StockReviewStep } from './StockReviewStep'
import type { StockStep } from '@/features/lofi-stock/lib/constants'
import type { ExpandResult } from '@/features/lofi-stock/lib/expand-types'
import type { TextModel, VisualAsset } from '@/shared/lib/types'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'
import {
  getPlaylistOverTargetMessage,
} from '@/features/lofi-stock/lib/playlist-utils'

const DEFAULT_VISUAL_MODEL = 'flux-schnell-fal'
const LOFI_STOCK_OPTIONS_STORAGE_KEY = 'new-lofi-stock:options'
const DEFAULT_DURATION_SEC = 3600

type StoredLofiStockOptions = {
  textModel?: TextModel
  duration?: number
  visualCount?: number
  visualModel?: string
}

export function LofiStockForm() {
  return (
    <AudioPlayerProvider>
      <LofiStockFormInner />
    </AudioPlayerProvider>
  )
}

function LofiStockFormInner() {
  const router = useRouter()
  const { pause, isItemActive } = useAudioPlayer()

  const [step, setStep] = useState<StockStep>('playlist')
  const [phase, setPhase] = useState<'idle' | 'expanding' | 'submitting'>('idle')

  const [vibe, setVibe] = useState('')
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_SEC)
  const [visualCount, setVisualCount] = useState(4)
  const [visualModel, setVisualModel] = useState(DEFAULT_VISUAL_MODEL)
  const [textModel, setTextModel] = useState<TextModel>(DEFAULT_TEXT_MODEL)
  const [expandResult, setExpandResult] = useState<ExpandResult | null>(null)
  const [editedVisualPrompts, setEditedVisualPrompts] = useState<string[]>([])
  const [balance, setBalance] = useState<number | null>(null)

  const [selectedTracks, setSelectedTracks] = useState<FreetouseTrack[]>([])

  const isBusy = phase === 'expanding' || phase === 'submitting'

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOFI_STOCK_OPTIONS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredLofiStockOptions
      if (parsed.textModel && TEXT_MODEL_OPTIONS.some((o) => o.value === parsed.textModel)) {
        setTextModel(parsed.textModel)
      }
      if (typeof parsed.duration === 'number' && ALLOWED_DURATION_SEC.includes(parsed.duration)) {
        setDuration(parsed.duration)
      }
      if (typeof parsed.visualCount === 'number' && parsed.visualCount >= 1 && parsed.visualCount <= 12) {
        setVisualCount(parsed.visualCount)
      }
      if (parsed.visualModel && VISUAL_MODEL_OPTIONS.some((o) => o.value === parsed.visualModel)) {
        setVisualModel(parsed.visualModel)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        LOFI_STOCK_OPTIONS_STORAGE_KEY,
        JSON.stringify({ textModel, duration, visualCount, visualModel } satisfies StoredLofiStockOptions),
      )
    } catch { /* ignore */ }
  }, [textModel, duration, visualCount, visualModel])

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json() as { credits?: number }
        setBalance(data.credits ?? null)
      }
    } catch { /* ignore */ }
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
    if (isItemActive(id)) pause()
  }, [isItemActive, pause])

  const moveTrack = useCallback((index: number, direction: -1 | 1) => {
    setSelectedTracks((prev) => {
      const next = [...prev]
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= next.length) return prev
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
  }, [])

  const expandBody = useCallback((overrides?: { targetVisualCount?: number }) => ({
    vibe: vibe.trim(),
    targetDurationSec: duration,
    textModel,
    targetVisualCount:
      overrides?.targetVisualCount ?? (editedVisualPrompts.length || visualCount),
  }), [vibe, duration, textModel, editedVisualPrompts.length, visualCount])

  const runExpand = useCallback(async () => {
    setPhase('expanding')
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody({ targetVisualCount: visualCount })),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to expand prompts')
      }
      const result = await res.json() as ExpandResult
      setExpandResult(result)
      setEditedVisualPrompts([...result.visualPrompts])
      setPhase('idle')
      void fetchBalance()
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not generate scene ideas. Please try again.'))
      setPhase('idle')
      setStep('setup')
    }
  }, [expandBody, visualCount, fetchBalance])

  const handleContinueFromPlaylist = useCallback(() => {
    if (selectedTracks.length === 0) {
      toast.error('Add at least one track to your playlist.')
      return
    }
    setStep('setup')
  }, [selectedTracks.length])

  const handleContinueFromSetup = useCallback(async () => {
    const trimmed = vibe.trim()
    if (trimmed.length < 10) {
      toast.error('Vibe needs at least 10 characters.')
      return
    }
    const overTargetMessage = getPlaylistOverTargetMessage(selectedTracks, duration)
    if (overTargetMessage) {
      toast.error(overTargetMessage)
      return
    }
    setStep('visuals')
    if (expandResult && editedVisualPrompts.length > 0) {
      return
    }
    await runExpand()
  }, [vibe, duration, selectedTracks, expandResult, editedVisualPrompts.length, runExpand])

  const handleDurationChange = useCallback((sec: number) => {
    const overTargetMessage = getPlaylistOverTargetMessage(selectedTracks, sec)
    if (overTargetMessage) {
      toast.error(overTargetMessage)
    }
    setDuration(sec)
  }, [selectedTracks])

  const handleRegenerateVisual = async (index: number) => {
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody({ targetVisualCount: 1 })),
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

  const handleRegenerateAll = async () => {
    await runExpand()
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
      setPhase('idle')
    }
  }

  const handleBack = () => {
    if (step === 'setup') setStep('playlist')
    else if (step === 'visuals') setStep('setup')
    else if (step === 'review') setStep('visuals')
  }

  const playlistPanelProps = {
    tracks: selectedTracks,
    onRemove: removeTrack,
    onMoveUp: (i: number) => moveTrack(i, -1),
    onMoveDown: (i: number) => moveTrack(i, 1),
    onContinue: handleContinueFromPlaylist,
    continueDisabled: selectedTracks.length === 0 || isBusy,
    continueLabel: 'Continue',
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[18px] px-6 pb-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          ◈ lofi-stock
        </span>
        <h1 style={{ marginTop: 10 }}>New lofi-stock video</h1>
      </div>

      <div className="glass-panel mt-2 flex flex-col gap-5 p-6 md:p-8">
        <LofiStockStepHeader
          step={step}
          showBack={step !== 'playlist'}
          onBack={handleBack}
        />

        {step === 'playlist' && (
        <>
          <div className="lg:hidden">
            <StockPlaylistPanel {...playlistPanelProps} compact />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <StockTrackBrowser
              isTrackSelected={isTrackSelected}
              onToggleTrack={toggleTrack}
              disabled={isBusy}
              enabled={step === 'playlist'}
            />
            <div className="hidden lg:block">
              <StockPlaylistPanel {...playlistPanelProps} />
            </div>
          </div>
        </>
      )}

      {step === 'setup' && (
        <StockSetupStep
          vibe={vibe}
          onVibeChange={setVibe}
          duration={duration}
          onDurationChange={handleDurationChange}
          textModel={textModel}
          onTextModelChange={(model) => {
            setTextModel(model)
            setExpandResult(null)
            setEditedVisualPrompts([])
          }}
          visualCount={visualCount}
          onVisualCountChange={(count) => {
            setVisualCount(count)
            setExpandResult(null)
            setEditedVisualPrompts([])
          }}
          selectedTracks={selectedTracks}
          disabled={isBusy}
          isContinuing={phase === 'expanding'}
          onContinue={() => void handleContinueFromSetup()}
          continueDisabled={vibe.trim().length < 10 || isBusy}
        />
      )}

      {step === 'visuals' && (
        <div className="mx-auto w-full max-w-3xl">
          <StockVisualsStep
            expandResult={expandResult}
            editedVisualPrompts={editedVisualPrompts}
            onPromptsChange={setEditedVisualPrompts}
            onRegenerateVisual={handleRegenerateVisual}
            onRemoveVisual={(i) => setEditedVisualPrompts(editedVisualPrompts.filter((_, idx) => idx !== i))}
            onAddVisual={handleAddVisual}
            onRegenerateAll={handleRegenerateAll}
            duration={duration}
            visualModel={visualModel}
            onVisualModelChange={setVisualModel}
            disabled={isBusy}
            isExpanding={phase === 'expanding'}
            onContinue={() => {
              void fetchBalance()
              setStep('review')
            }}
            continueDisabled={!expandResult || editedVisualPrompts.length === 0 || isBusy}
          />
        </div>
      )}

      {step === 'review' && expandResult && (
        <div className="mx-auto w-full max-w-3xl">
          <StockReviewStep
            expandResult={expandResult}
            selectedTracks={selectedTracks}
            duration={duration}
            visualModel={visualModel}
            visualPromptCount={editedVisualPrompts.length}
            balance={balance}
            onEditPlaylist={() => setStep('playlist')}
            onGenerate={() => void handleSubmit()}
            isSubmitting={phase === 'submitting'}
          />
        </div>
      )}
      </div>
    </div>
  )
}
