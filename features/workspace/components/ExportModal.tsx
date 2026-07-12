'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, AlertTriangle, Loader2, RefreshCw, Mic, ExternalLink } from 'lucide-react'
import type { Scene } from '@/shared/lib/types'
import { useExportState, type ExportOptions } from '@/features/workspace/context/export-state'
import { useWorkspace } from '@/features/workspace/context/workspace-context'
import { StickmanScribble } from './media/StickmanScribble'
import { Button } from '@/shared/ui/button'

interface Props {
  open: boolean
  onClose: () => void
  storyId: string
  scenes: Scene[]
}

export function ExportModal({ open, onClose, storyId, scenes: scenesProp }: Props) {
  const { state, startExport, cancelExport, reset } = useExportState()
  const { storyData, setStoryData, retryVoice, generateAllVoiceovers } = useWorkspace()
  const [includeIntro, setIncludeIntro] = useState(true)
  const [rangeOn, setRangeOn] = useState(false)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(scenesProp.length)
  const [genVoiceovers, setGenVoiceovers] = useState(false)

  // Prefer live scenes from the workspace so voiceover pending/error/URL changes
  // reflect in the modal (props are a snapshot taken when the button mounted).
  const scenes = storyData?.scenes ?? scenesProp
  const isStaticMode = scenes.every((s) => !s.videoUrl)

  useEffect(() => { setTo(scenes.length) }, [scenes.length])

  // Export requires every scene's voiceover (even out-of-range scenes are part of
  // the story), and generateAllVoiceovers covers the whole story — so the guard
  // and the button count both operate over all scenes, not just the range.
  const missingVoiceovers = scenes.filter((s) => !s.voiceoverUrl)
  const failedVoiceovers = scenes.filter((s) => !s.voiceoverUrl && s.voiceoverError)

  const runGenerateVoiceovers = async () => {
    if (!generateAllVoiceovers) return
    setGenVoiceovers(true)
    try {
      await generateAllVoiceovers()
    } finally {
      setGenVoiceovers(false)
    }
  }

  // Export done → stamp the URL + fresh timestamps onto storyData so the finished
  // video survives modal close (server already persisted it) and reads as current
  // (composedAt ≈ updatedAt ⇒ not stale) without needing a reload.
  useEffect(() => {
    if (state.status === 'done' && state.downloadUrl) {
      setStoryData((prev) => {
        if (!prev || prev.composedVideoUrl === state.downloadUrl) return prev
        const now = Date.now()
        return { ...prev, composedVideoUrl: state.downloadUrl, composedAt: now, updatedAt: now }
      })
    }
  }, [state.status, state.downloadUrl, setStoryData])

  if (!open || typeof document === 'undefined') return null

  const showProgress = state.status === 'rendering' || state.status === 'preparing' || state.status === 'done' || state.status === 'failed'
  const totalSec = scenes.reduce((acc, s) => acc + (s.voiceoverDuration ?? 0), 0)

  const missingSceneNumbers = missingVoiceovers.map((m) => scenes.indexOf(m) + 1)

  return createPortal(
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative z-[901] max-h-[90vh] w-[480px] max-w-[92vw] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3.5 flex items-center justify-between">
          <h3>{showProgress ? 'Exporting…' : 'Export video'}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={14} />
          </Button>
        </div>

        {!showProgress && (
          <>
            {isStaticMode && (
              <div className="my-2 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-[0.78rem] text-[var(--muted)]">
                No animations found - exporting as static slideshow.
              </div>
            )}
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

            {missingVoiceovers.length > 0 && (
              <div className="my-3 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface2))] p-3">
                <div className="flex items-start gap-2 text-[0.82rem] text-[var(--text)]">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                  <span>
                    {missingVoiceovers.length} scene{missingVoiceovers.length > 1 ? 's' : ''} missing
                    voiceover{missingVoiceovers.length > 1 ? 's' : ''} (scene {missingSceneNumbers.join(', ')}).
                    Generate them before exporting.
                  </span>
                </div>

                <Button
                  className="mt-2.5 w-full"
                  disabled={genVoiceovers || !generateAllVoiceovers}
                  onClick={runGenerateVoiceovers}
                >
                  {genVoiceovers ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating {missingVoiceovers.length}…</>
                  ) : (
                    <><Mic size={14} /> Generate {missingVoiceovers.length} missing voiceover{missingVoiceovers.length > 1 ? 's' : ''}</>
                  )}
                </Button>

                {failedVoiceovers.length > 0 && !genVoiceovers && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--danger)]">
                      Failed — retry individually
                    </p>
                    {failedVoiceovers.map((s) => {
                      const num = scenes.indexOf(s) + 1
                      return (
                        <div
                          key={s.id}
                          className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[0.78rem]"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="font-semibold">Scene {num}</span>
                            <span className="rounded bg-[var(--surface2)] px-1.5 py-0.5 text-[0.68rem] capitalize text-[var(--muted)]">
                              {s.emotion} · {s.characters} char
                            </span>
                          </div>
                          <p className="mb-1 line-clamp-2 text-[var(--muted)]">“{s.voiceover}”</p>
                          <p className="mb-2 text-[0.72rem] text-[var(--danger)]">{s.voiceoverError}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-[0.72rem]"
                            disabled={s.voiceoverPending}
                            onClick={() => void retryVoice?.(s.id)}
                          >
                            {s.voiceoverPending
                              ? <><Loader2 size={12} className="animate-spin" /> Retrying…</>
                              : <><RefreshCw size={12} /> Retry scene {num}</>}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                disabled={missingVoiceovers.length > 0 || genVoiceovers}
                onClick={() => {
                  const opts: ExportOptions = {
                    resolution: '1080p',
                    includeIntro,
                    range: rangeOn ? { from, to } : undefined,
                  }
                  startExport(storyId, scenes, opts)
                }}
              >
                Start Export
              </Button>
            </div>
          </>
        )}

        {showProgress && (
          <>
            {(state.status === 'preparing' || state.status === 'rendering') && (
              <div className="flex flex-col items-center gap-2.5">
                <StickmanScribble variant="small" />
                <div style={{ fontSize: '0.85rem' }}>
                  {state.status === 'preparing'
                    ? 'Preparing tracks…'
                    : 'Composing video on server…'}
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                  <div style={{ width: `${state.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 200ms ease' }} />
                </div>
                <Button variant="outline" onClick={cancelExport} className="border-red-500/30 text-[var(--danger)]">Cancel</Button>
              </div>
            )}
            {state.status === 'done' && state.downloadUrl && (
              <div className="flex flex-col gap-3">
                <p className="text-[0.85rem] text-[var(--muted)]">Render complete.</p>
                <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-black">
                  <video
                    key={state.downloadUrl}
                    src={state.downloadUrl}
                    poster={storyData?.thumbnailUrl ?? undefined}
                    controls
                    playsInline
                    className="block aspect-video w-full bg-black"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href={state.downloadUrl} download={`story-${storyId}.mp4`}>
                      <Download size={14} /> Download MP4
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={state.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} /> Open in new tab
                    </a>
                  </Button>
                </div>
                <p className="text-[0.75rem] text-[var(--muted)]">
                  Also available anytime in the <span className="font-medium text-[var(--text)]">Video</span> tab.
                </p>
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { reset(); onClose() }}>Close</Button>
                  <Button variant="outline" onClick={reset}>Render again</Button>
                </div>
              </div>
            )}
            {state.status === 'failed' && (
              <div>
                <div className="my-2 rounded-lg border border-[#ef4444] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-[#fca5a5]">{state.error ?? 'Export failed'}</div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { reset(); onClose() }}>Close</Button>
                  <Button onClick={reset}>Retry</Button>
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
