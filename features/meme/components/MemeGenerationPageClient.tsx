'use client'

import Link from 'next/link'
import type { MemeGeneration } from '@/shared/lib/types'
import { MemeGenerationWorkspace } from './MemeGenerationWorkspace'

export function MemeGenerationPageClient({ generation }: { generation: MemeGeneration }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[18px] px-6 pb-20 pt-7">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:underline">
          ← Dashboard
        </Link>
        <span className="text-[var(--muted)]">·</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          😂 meme
        </span>
      </div>
      <MemeGenerationWorkspace
        generationId={generation.id}
        idea={generation.inputText}
        initialVariants={generation.variants}
        backToDashboard
      />
    </div>
  )
}
