'use client'

import { Stepper } from '@/shared/ui/stepper'
import type { LofiStep } from '@/features/lofi/lib/constants'

const STEPS = [
  { id: 'setup' as LofiStep, label: 'Setup' },
  { id: 'prompts' as LofiStep, label: 'Prompts' },
  { id: 'review' as LofiStep, label: 'Review' },
]

export function LofiStepper({ step }: { step: LofiStep }) {
  return <Stepper steps={STEPS} currentStep={step} />
}
