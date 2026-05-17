'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'
import type { Scene } from '@/lib/types'
import { useExportState, type ExportOptions } from '@/context/export-state'
import { StickmanScribble } from './media/StickmanScribble'

interface Props {
  open: boolean
  onClose: () => void
  storyId: string
  scenes: Scene[]
}

export function ExportModal({ open, onClose, storyId, scenes }: Props) {
  const { state, startExport, cancelExport, reset } = useExportState()
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p')
  const [includeIntro, setIncludeIntro] = useState(true)
  const [rangeOn, setRangeOn] = useState(false)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(scenes.length)

  useEffect(() => { setTo(scenes.length) }, [scenes.length])

  if (!open || typeof document === 'undefined') return null

  const showProgress = state.status === 'rendering' || state.status === 'preparing' || state.status === 'done' || state.status === 'failed'
  const totalSec = scenes.reduce((acc, s) => acc + (s.voiceoverDuration ?? 0), 0)

  return createPortal(
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative z-[901] max-h-[90vh] w-[480px] max-w-[92vw] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3.5 flex items-center justify-between">
          <h3>{showProgress ? 'Exporting…' : 'Export video'}</h3>
          <button
            className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {!showProgress && (
          <>
            <div className="my-2 flex items-center gap-2.5">
              <label style={{ width: 110, color: 'var(--muted)' }}>Resolution</label>
              <label><input type="radio" checked={resolution === '720p'} onChange={() => setResolution('720p')} /> 720p</label>
              <label><input type="radio" checked={resolution === '1080p'} onChange={() => setResolution('1080p')} /> 1080p</label>
            </div>
            <div className="my-2 flex items-center gap-2.5">
              <label style={{ width: 110, color: 'var(--muted)' }}>Intro</label>
              <label><input type="checkbox" checked={includeIntro} onChange={(e) => setIncludeIntro(e.target.checked)} /> Include thumbnail intro</label>
            </div>
            <div className="my-2 flex items-center gap-2.5">
              <label style={{ width: 110, color: 'var(--muted)' }}>Range</label>
              <label><input type="checkbox" checked={rangeOn} onChange={(e) => setRangeOn(e.target.checked)} /> Limit to range</label>
              {rangeOn && (
                <>
                  <input type="number" min={1} max={scenes.length} value={from} onChange={(e) => setFrom(+e.target.value)} style={{ width: 60 }} />
                  <span>–</span>
                  <input type="number" min={1} max={scenes.length} value={to} onChange={(e) => setTo(+e.target.value)} style={{ width: 60 }} />
                </>
              )}
            </div>
            <div className="my-2 flex items-center gap-2.5 text-[0.78rem] text-[var(--muted)]">
              Est. duration: {Math.round(totalSec)}s
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)]" onClick={onClose}>Cancel</button>
              <button
                className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)]"
                onClick={() => {
                  const opts: ExportOptions = {
                    resolution,
                    includeIntro,
                    range: rangeOn ? { from, to } : undefined,
                  }
                  startExport(storyId, scenes, opts)
                }}
              >
                Start Export
              </button>
            </div>
          </>
        )}

        {showProgress && (
          <>
            {(state.status === 'preparing' || state.status === 'rendering') && (
              <div className="flex flex-col items-center gap-2.5">
                <StickmanScribble variant="small" />
                <div style={{ fontSize: '0.85rem' }}>
                  {state.status === 'preparing' ? 'Preparing tracks…' : 'Composing video…'}
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                  <div style={{ width: `${state.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 200ms ease' }} />
                </div>
                <button className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[var(--surface2)] px-2.5 text-[var(--danger)]" onClick={cancelExport}>Cancel</button>
              </div>
            )}
            {state.status === 'done' && state.downloadUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Render complete.</p>
                <a className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)]" href={state.downloadUrl} download={`story-${storyId}.mp4`}>
                  <Download size={14} /> Download MP4
                </a>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)]" onClick={() => { reset(); onClose() }}>Close</button>
                  <button className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)]" onClick={reset}>Render again</button>
                </div>
              </div>
            )}
            {state.status === 'failed' && (
              <div>
                <div className="my-2 rounded-lg border border-[#ef4444] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-[#fca5a5]">{state.error ?? 'Export failed'}</div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)]" onClick={() => { reset(); onClose() }}>Close</button>
                  <button className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)]" onClick={reset}>Retry</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
