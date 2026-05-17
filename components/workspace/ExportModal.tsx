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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{showProgress ? 'Exporting…' : 'Export video'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={14} /></button>
        </div>

        {!showProgress && (
          <>
            <div className="modal-row">
              <label style={{ width: 110, color: 'var(--muted)' }}>Resolution</label>
              <label><input type="radio" checked={resolution === '720p'} onChange={() => setResolution('720p')} /> 720p</label>
              <label><input type="radio" checked={resolution === '1080p'} onChange={() => setResolution('1080p')} /> 1080p</label>
            </div>
            <div className="modal-row">
              <label style={{ width: 110, color: 'var(--muted)' }}>Intro</label>
              <label><input type="checkbox" checked={includeIntro} onChange={(e) => setIncludeIntro(e.target.checked)} /> Include thumbnail intro</label>
            </div>
            <div className="modal-row">
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
            <div className="modal-row" style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
              Est. duration: {Math.round(totalSec)}s
            </div>
            <div className="modal-actions">
              <button className="icon-btn" onClick={onClose}>Cancel</button>
              <button
                className="icon-btn icon-btn--primary"
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <StickmanScribble variant="small" />
                <div style={{ fontSize: '0.85rem' }}>
                  {state.status === 'preparing' ? 'Preparing tracks…' : 'Composing video…'}
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                  <div style={{ width: `${state.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 200ms ease' }} />
                </div>
                <button className="icon-btn icon-btn--danger" onClick={cancelExport}>Cancel</button>
              </div>
            )}
            {state.status === 'done' && state.downloadUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Render complete.</p>
                <a className="icon-btn icon-btn--primary" href={state.downloadUrl} download={`story-${storyId}.mp4`}>
                  <Download size={14} /> Download MP4
                </a>
                <div className="modal-actions">
                  <button className="icon-btn" onClick={() => { reset(); onClose() }}>Close</button>
                  <button className="icon-btn" onClick={reset}>Render again</button>
                </div>
              </div>
            )}
            {state.status === 'failed' && (
              <div>
                <div className="inline-banner inline-banner--error">{state.error ?? 'Export failed'}</div>
                <div className="modal-actions">
                  <button className="icon-btn" onClick={() => { reset(); onClose() }}>Close</button>
                  <button className="icon-btn icon-btn--primary" onClick={reset}>Retry</button>
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
