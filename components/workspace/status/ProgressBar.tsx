'use client'

interface ProgressBarProps {
  progress: {
    pct: number
    label: string
  }
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
      </div>
      <span className="progress-label">{progress.label}</span>
    </div>
  )
}
