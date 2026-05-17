'use client'

interface Props {
  variant?: 'large' | 'small'
}

export function StickmanScribble({ variant = 'large' }: Props) {
  return (
    <svg
      viewBox="0 0 60 100"
      className={`stickman-scribble${variant === 'small' ? ' stickman-scribble--small' : ''}`}
      aria-hidden="true"
    >
      <circle cx="30" cy="18" r="10" />
      <line x1="30" y1="28" x2="30" y2="60" />
      <line x1="30" y1="35" x2="12" y2="48" />
      <line x1="30" y1="35" x2="48" y2="48" />
      <line x1="30" y1="60" x2="16" y2="88" />
      <line x1="30" y1="60" x2="44" y2="88" />
    </svg>
  )
}
