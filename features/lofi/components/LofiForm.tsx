'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import { DURATION_OPTIONS, MUSIC_MODEL_OPTIONS, VISUAL_MODEL_OPTIONS } from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_OPTIONS, DEFAULT_TEXT_MODEL } from '@/shared/lib/text-model-options'
import { calcVisualDuration } from '@/features/lofi/lib/visual-duration'
import { LofiStepHeader } from './LofiStepHeader'
import { LofiSetupStep } from './LofiSetupStep'
import { LofiPromptsStep } from './LofiPromptsStep'
import { LofiReviewStep } from './LofiReviewStep'
import type { LofiStep } from '@/features/lofi/lib/constants'
import { storyHref } from '@/shared/lib/categories'
import type { TextModel, VisualMode, VisualAsset } from '@/shared/lib/types'

const DEFAULT_MUSIC_MODEL = 'minimax'
const DEFAULT_VISUAL_MODEL = 'flux-schnell-fal'
const LOFI_OPTIONS_STORAGE_KEY = 'new-lofi:options'
const DEFAULT_DURATION_SEC = 3600

interface ExpandResult {
  musicPrompts: string[]
  visualPrompts: string[]
  visualMode: VisualMode
  suggestedTitle: string
  suggestedAmbientBed: string | null
}

export function LofiForm({ onBackToStart }: { onBackToStart?: () => void }) {
  const router = useRouter()

  const [vibe, setVibe] = useState('')
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_SEC)
  const [visualCount, setVisualCount] = useState(4)
  const [musicModel, setMusicModel] = useState(DEFAULT_MUSIC_MODEL)
  const [visualModel, setVisualModel] = useState(DEFAULT_VISUAL_MODEL)
  const [textModel, setTextModel] = useState<TextModel>(DEFAULT_TEXT_MODEL)

  const [step, setStep] = useState<LofiStep>('setup')
  const [isExpanding, setIsExpanding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandResult, setExpandResult] = useState<ExpandResult | null>(null)
  const [editedMusicPrompts, setEditedMusicPrompts] = useState<string[]>([])
  const [editedVisualPrompts, setEditedVisualPrompts] = useState<string[]>([])
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOFI_OPTIONS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { textModel?: TextModel }
      if (parsed.textModel && TEXT_MODEL_OPTIONS.some((o) => o.value === parsed.textModel)) {
        setTextModel(parsed.textModel)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      const pending = localStorage.getItem('new:pending-prompt')
      if (pending) {
        setVibe(pending)
        localStorage.removeItem('new:pending-prompt')
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LOFI_OPTIONS_STORAGE_KEY, JSON.stringify({ textModel }))
    } catch { /* ignore */ }
  }, [textModel])

  const expandBody = (overrides?: { targetVisualCount?: number }) => ({
    vibe: vibe.trim(),
    targetDurationSec: duration,
    textModel,
    targetVisualCount:
      overrides?.targetVisualCount ??
      (step === 'prompts' ? editedVisualPrompts.length : visualCount),
  })

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json() as { credits?: number }
        setBalance(data.credits ?? null)
      }
    } catch { /* ignore */ }
  }, [])

  const handleExpand = async () => {
    if (expandResult) {
      setStep('prompts')
      return
    }
    const trimmed = vibe.trim()
    if (trimmed.length < 10) {
      toast.error('Vibe needs at least 10 characters.')
      return
    }
    setIsExpanding(true)
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
      setEditedMusicPrompts([...result.musicPrompts])
      setEditedVisualPrompts([...result.visualPrompts])
      setStep('prompts')
      fetchBalance()
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not generate prompts. Please try again.'))
    } finally {
      setIsExpanding(false)
    }
  }

  const handleRegenerateAll = async () => {
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
      setEditedMusicPrompts(result.musicPrompts)
      setEditedVisualPrompts(result.visualPrompts)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not regenerate prompts. Please try again.'))
    }
  }

  const handleRegenerateMusic = async (index: number) => {
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
      const result = (await res.json()) as ExpandResult
      const updated = [...editedMusicPrompts]
      updated[index] = result.musicPrompts[0] ?? ''
      setEditedMusicPrompts(updated)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not regenerate that prompt. Please try again.'))
    }
  }

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
      const result = (await res.json()) as ExpandResult
      const updated = [...editedVisualPrompts]
      updated[index] = result.visualPrompts[0] ?? ''
      setEditedVisualPrompts(updated)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not regenerate that prompt. Please try again.'))
    }
  }

  const handleAddMusic = async () => {
    const insertIndex = editedMusicPrompts.length
    setEditedMusicPrompts((prev) => [...prev, ''])
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody({ targetVisualCount: 1 })),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to add prompt')
      }
      const result = (await res.json()) as ExpandResult
      setEditedMusicPrompts((prev) => {
        const updated = [...prev]
        updated[insertIndex] = result.musicPrompts[0] ?? ''
        return updated
      })
    } catch (err) {
      setEditedMusicPrompts((prev) => prev.filter((_, i) => i !== insertIndex))
      toast.error(toUserErrorMessage(err, 'Could not add that prompt. Please try again.'))
    }
  }

  const handleAddVisual = async () => {
    const insertIndex = editedVisualPrompts.length
    setEditedVisualPrompts((prev) => [...prev, ''])
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody({ targetVisualCount: 1 })),
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
    setIsSubmitting(true)

    const visualMode = expandResult.visualMode
    const assets: VisualAsset[] = editedVisualPrompts.map((prompt, i) => ({
      prompt,
      durationSec: calcVisualDuration(i, visualMode, editedVisualPrompts.length, duration),
    }))

    try {
      const res = await fetch('/api/lofi/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe: vibe.trim(),
          targetDurationSec: duration,
          musicModel,
          musicLoopCount: editedMusicPrompts.length,
          visualConfig: {
            mode: visualMode,
            model: visualModel,
            assets,
          },
          musicPrompts: editedMusicPrompts,
          visualPrompts: editedVisualPrompts,
          suggestedTitle: expandResult.suggestedTitle,
          suggestedAmbientBed: expandResult.suggestedAmbientBed,
        }),
      })

      const data = await res.json() as { storyId?: string; error?: string }

      if (!res.ok || !data.storyId) {
        throw new Error(data.error ?? 'Failed to generate video')
      }

      toast.success('Generation started!')
      router.push(storyHref(data.storyId))
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not start generation. Please try again.'))
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step === 'prompts') setStep('setup')
    else if (step === 'review') setStep('prompts')
    else if (step === 'setup') onBackToStart?.()
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[18px] px-6 pb-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          ◈ lofi
        </span>
        <h1 style={{ marginTop: 10 }}>New lofi video</h1>
      </div>

      <div className="glass-panel mt-2 flex flex-col gap-5 p-6 md:p-8">
        <LofiStepHeader step={step} />

        {step === 'setup' && (
          <LofiSetupStep
            vibe={vibe}
            onVibeChange={setVibe}
            duration={duration}
            onDurationChange={setDuration}
            textModel={textModel}
            onTextModelChange={setTextModel}
            musicModel={musicModel}
            onMusicModelChange={setMusicModel}
            visualModel={visualModel}
            onVisualModelChange={setVisualModel}
            visualCount={visualCount}
            onVisualCountChange={setVisualCount}
            isExpanding={isExpanding}
            onNext={handleExpand}
            onBack={onBackToStart}
          />
        )}

        {step === 'prompts' && expandResult && (
          <LofiPromptsStep
            musicPrompts={editedMusicPrompts}
            onMusicPromptsChange={setEditedMusicPrompts}
            onRegenerateMusic={handleRegenerateMusic}
            onAddMusic={editedMusicPrompts.length < 30 ? handleAddMusic : undefined}
            visualPrompts={editedVisualPrompts}
            onVisualPromptsChange={setEditedVisualPrompts}
            onRegenerateVisual={handleRegenerateVisual}
            onAddVisual={editedVisualPrompts.length < 12 ? handleAddVisual : undefined}
            visualMode={expandResult.visualMode}
            duration={duration}
            onRegenerateAll={handleRegenerateAll}
            onNext={() => {
              fetchBalance()
              setStep('review')
            }}
            onBack={handleBack}
          />
        )}

        {step === 'review' && expandResult && (
          <LofiReviewStep
            musicModel={musicModel}
            musicLoopCount={editedMusicPrompts.length}
            visualModel={visualModel}
            visualAssetCount={editedVisualPrompts.length}
            balance={balance}
            isSubmitting={isSubmitting}
            onGenerate={handleSubmit}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  )
}
