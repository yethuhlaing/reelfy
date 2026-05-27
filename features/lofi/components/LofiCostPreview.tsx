'use client'

import { RENDER_CREDITS, MUSIC_PRICING, VISUAL_PRICING } from '@/features/lofi/lib/pricing-constants'

interface CostBreakdown {
  musicCredits: number
  musicCost: number
  visualCredits: number
  visualCost: number
  renderCredits: number
  totalCredits: number
  totalCost: number
}

function calculateCosts(
  musicModel: string,
  musicLoopCount: number,
  visualModel: string,
  visualAssetCount: number,
): CostBreakdown {
  const musicPricing = MUSIC_PRICING[musicModel] ?? { creditsPerLoop: 5, costPerLoopUsd: 0.1 }
  const musicCredits = musicPricing.creditsPerLoop * musicLoopCount
  const musicCost = musicPricing.costPerLoopUsd * musicLoopCount

  const visualPricing = VISUAL_PRICING[visualModel] ?? { credits: 1, costUsd: 0.003 }
  const visualCredits = visualPricing.credits * visualAssetCount
  const visualCost = visualPricing.costUsd * visualAssetCount

  return {
    musicCredits,
    musicCost,
    visualCredits,
    visualCost,
    renderCredits: RENDER_CREDITS,
    totalCredits: musicCredits + visualCredits + RENDER_CREDITS,
    totalCost: musicCost + visualCost + RENDER_CREDITS * 0.01,
  }
}

export function LofiCostPreview({
  musicModel,
  musicLoopCount,
  visualModel,
  visualAssetCount,
  balance,
}: {
  musicModel: string
  musicLoopCount: number
  visualModel: string
  visualAssetCount: number
  balance: number | null
}) {
  const costs = calculateCosts(musicModel, musicLoopCount, visualModel, visualAssetCount)
  const insufficient = balance !== null && costs.totalCredits > balance

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" style={{ fontSize: '0.82rem' }}>
      <div className="mb-2 font-semibold text-[var(--text)]" style={{ fontSize: '0.85rem' }}>
        Cost preview
      </div>
      <div className="flex flex-col gap-1.5">
        <Row label="Music" detail={`${musicLoopCount} × ${musicModel}`} credits={costs.musicCredits} usd={costs.musicCost} />
        <Row label="Visual" detail={`${visualAssetCount} × ${visualModel}`} credits={costs.visualCredits} usd={costs.visualCost} />
        <Row label="Render" detail="flat fee" credits={costs.renderCredits} usd={0} />
      </div>
      <div className="my-2 border-t border-[var(--border)]" />
      <div className="flex items-center justify-between">
        <span className="text-[var(--text)]">Total</span>
        <span className="font-semibold text-[var(--text)]">{costs.totalCredits} credits</span>
      </div>
      {balance !== null && (
        <div className={`mt-1 text-right ${insufficient ? 'text-[var(--danger)]' : 'text-[var(--muted)]'}`} style={{ fontSize: '0.75rem' }}>
          Balance: {balance} credits
          {insufficient && ' — insufficient'}
        </div>
      )}
    </div>
  )
}

function Row({ label, detail, credits }: { label: string; detail: string; credits: number; usd: number }) {
  return (
    <div className="flex items-center justify-between text-[var(--muted)]">
      <span>
        {label}{' '}
        <span className="text-[var(--muted)]" style={{ fontSize: '0.75rem' }}>
          ({detail})
        </span>
      </span>
      <span className="text-[var(--text)]">{credits} cr</span>
    </div>
  )
}
