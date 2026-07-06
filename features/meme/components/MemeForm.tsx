'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Sparkles } from 'lucide-react'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type { MemeGenResult, MemeVariant } from '@/shared/lib/types'
import { ConfigPill } from '@/features/lofi/components/ConfigPill'
import { CAPTION_MODEL_OPTIONS, CAPTION_MODEL, type CaptionModel } from '@/features/meme/server/caption-models'
import { MemeGenerationWorkspace } from './MemeGenerationWorkspace'

const MEME_OPTIONS_STORAGE_KEY = 'new-meme:options'
const VARIANT_COUNT_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
]

export function MemeForm({ onBackToStart }: { onBackToStart?: () => void }) {
  const [idea, setIdea] = useState('')
  const [captionModel, setCaptionModel] = useState<CaptionModel>(CAPTION_MODEL)
  const [variantCount, setVariantCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [variants, setVariants] = useState<MemeVariant[]>([])
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    try {
      const pending = localStorage.getItem('new:pending-prompt')
      if (pending) {
        setIdea(pending)
        localStorage.removeItem('new:pending-prompt')
      }
      const rawOpts = localStorage.getItem(MEME_OPTIONS_STORAGE_KEY)
      if (rawOpts) {
        const parsed = JSON.parse(rawOpts) as { captionModel?: CaptionModel; variantCount?: number }
        if (parsed.captionModel && CAPTION_MODEL_OPTIONS.some((o) => o.value === parsed.captionModel)) {
          setCaptionModel(parsed.captionModel)
        }
        if (parsed.variantCount && parsed.variantCount >= 1 && parsed.variantCount <= 3) {
          setVariantCount(parsed.variantCount)
        }
      }
    } catch { /* ignore */ }

    fetch('/api/credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { balance?: number } | null) => d && setBalance(d.balance ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(MEME_OPTIONS_STORAGE_KEY, JSON.stringify({ captionModel, variantCount }))
    } catch { /* ignore */ }
  }, [captionModel, variantCount])

  const handleGenerate = async () => {
    const trimmed = idea.trim()
    if (trimmed.length < 3) {
      toast.error('Describe your meme in a few words.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/meme/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: trimmed, captionModel, variantCount }),
      })
      const data = (await res.json()) as MemeGenResult & { error?: string }
      if (res.status === 402) throw new Error('Not enough credits to generate a meme.')
      if (!res.ok || !data.variants?.length || !data.generationId) {
        throw new Error(data.error ?? 'Failed to generate meme')
      }
      setGenerationId(data.generationId)
      setVariants(data.variants)
      setBalance(data.balance)
      toast.success(`${data.variants.length} meme${data.variants.length > 1 ? 's' : ''} saved to your dashboard`)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not generate memes. Please try again.'))
    } finally {
      setGenerating(false)
    }
  }

  const startOver = () => {
    setGenerationId(null)
    setVariants([])
    setIdea('')
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[18px] px-6 pb-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          😂 meme
        </span>
        <h1 style={{ marginTop: 10 }}>Meme generator</h1>
        {balance !== null && (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {balance} credits · 1 per generation · clean export 1 credit
          </p>
        )}
      </div>

      {!generationId ? (
        <div className="glass-panel flex flex-col gap-4 p-6 md:p-8">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">What's the meme about?</span>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. when the tests pass on the first try"
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
              }}
            />
            <span className="text-[0.7rem] text-[var(--muted-foreground)]">
              We pick the best templates and write the captions. All options save to your dashboard.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <ConfigPill
              label="Caption model"
              value={CAPTION_MODEL_OPTIONS.find((m: { value: string; label: string }) => m.value === captionModel)?.label ?? captionModel}
              options={CAPTION_MODEL_OPTIONS.map((m: { value: string; label: string }) => ({ value: m.value, label: m.label }))}
              current={captionModel}
              onChange={(v) => setCaptionModel(v as CaptionModel)}
              disabled={generating}
            />
            <ConfigPill
              label="Options"
              value={String(variantCount)}
              options={VARIANT_COUNT_OPTIONS}
              current={String(variantCount)}
              onChange={(v) => setVariantCount(Number(v))}
              disabled={generating}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate memes'}
            </button>
            {onBackToStart && (
              <button onClick={onBackToStart} className="text-sm text-[var(--muted-foreground)] hover:underline">
                Back
              </button>
            )}
          </div>
        </div>
      ) : (
        <MemeGenerationWorkspace
          generationId={generationId}
          idea={idea.trim()}
          initialVariants={variants}
          showNewIdea
          onNewIdea={startOver}
        />
      )}
    </div>
  )
}
