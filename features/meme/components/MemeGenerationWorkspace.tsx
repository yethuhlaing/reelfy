'use client'

import { useCallback, useState } from 'react'
import type { MemeVariant } from '@/shared/lib/types'
import { MemePreview } from './MemePreview'
import { MemeEditor } from './MemeEditor'

type Step = 'pick' | 'edit'

export function MemeGenerationWorkspace({
  generationId,
  idea,
  initialVariants,
  initialStep = 'pick',
  initialPickedTemplateId,
  showNewIdea = false,
  onNewIdea,
  backToDashboard,
}: {
  generationId: string
  idea: string
  initialVariants: MemeVariant[]
  initialStep?: Step
  initialPickedTemplateId?: string
  showNewIdea?: boolean
  onNewIdea?: () => void
  backToDashboard?: boolean
}) {
  const [variants, setVariants] = useState(initialVariants)
  const [step, setStep] = useState<Step>(initialStep)
  const [picked, setPicked] = useState<MemeVariant | null>(() => {
    if (!initialPickedTemplateId) return null
    return initialVariants.find((v) => v.templateId === initialPickedTemplateId) ?? null
  })

  const pickVariant = (v: MemeVariant) => {
    setPicked(v)
    setStep('edit')
  }

  const handleVariantUpdate = useCallback((updated: MemeVariant) => {
    setVariants((prev) => prev.map((v) => (v.templateId === updated.templateId ? updated : v)))
    setPicked(updated)
  }, [])

  const goToPick = () => {
    setPicked(null)
    setStep('pick')
  }

  if (step === 'edit' && picked) {
    return (
      <MemeEditor
        generationId={generationId}
        variant={picked}
        onBack={goToPick}
        backLabel={backToDashboard ? '← All variants' : '← Pick a different variant'}
        onVariantUpdate={handleVariantUpdate}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Pick your favorite</h2>
          <p className="text-sm text-[var(--muted)]">
            {idea ? `"${truncate(idea, 80)}"` : 'Your generated memes'} · {variants.length} options
          </p>
        </div>
        {showNewIdea && onNewIdea && (
          <button onClick={onNewIdea} className="text-sm text-[var(--muted)] hover:underline">
            ← New idea
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {variants.map((v) => (
          <button
            key={v.templateId}
            type="button"
            onClick={() => pickVariant(v)}
            className="glass-panel group flex h-full flex-col overflow-hidden p-3 text-left transition hover:ring-2 hover:ring-[var(--accent)]"
          >
            <div className="pointer-events-none flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md bg-[var(--surface2)]">
              <MemePreview
                imageUrl={v.imageUrl}
                width={v.width}
                height={v.height}
                boxes={v.boxes}
                sizeMode="fit-height"
              />
            </div>
            <div className="mt-2 flex min-h-[2rem] items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-[var(--muted)]">{v.templateName}</span>
              <span className="shrink-0 text-xs font-semibold text-[var(--accent)] opacity-0 transition group-hover:opacity-100">
                Edit →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
