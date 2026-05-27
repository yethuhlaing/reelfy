'use client'

import { Stepper } from '@/shared/ui/stepper'
import type { StockStep } from '@/features/lofi-stock/lib/constants'

const STEPS = [
  { id: 'playlist' as StockStep, label: 'Music' },
  { id: 'setup' as StockStep, label: 'Video' },
  { id: 'visuals' as StockStep, label: 'Visuals' },
  { id: 'review' as StockStep, label: 'Review' },
]

export function LofiStockStepper({ step }: { step: StockStep }) {
  return <Stepper steps={STEPS} currentStep={step} />
}
