'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Scene } from '../lib/types'
import type { ComposeResult, Job } from '../lib/jobs/types'
import { useJobPoller, type PendingJob } from '../hooks/use-poller'
import { updateComposedVideo, updateStoryScene } from '../lib/storage'

export type ExportPhase = 'idle' | 'preparing' | 'rendering' | 'done' | 'failed'

export interface ExportOptions {
  resolution: '720p' | '1080p'
  includeIntro: boolean
  range?: { from: number; to: number }
}

export interface ExportState {
  storyId: string | null
  status: ExportPhase
  progress: number
  jobId?: string
  startedAt?: number
  downloadUrl?: string
  error?: string
}

interface Ctx {
  state: ExportState
  startExport: (storyId: string, scenes: Scene[], opts: ExportOptions) => Promise<void>
  cancelExport: () => Promise<void>
  reset: () => void
}

const ExportCtx = createContext<Ctx | null>(null)

const initial: ExportState = { storyId: null, status: 'idle', progress: 0 }

async function probeAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) resolve(a.duration)
      else reject(new Error('Invalid duration'))
    }
    a.onerror = () => reject(new Error('Audio load failed'))
    a.src = url
  })
}

export function ExportStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExportState>(initial)

  const onCompleted = useCallback(
    (jobId: string, job: Job) => {
      const result = job.result as ComposeResult | undefined
      if (!result?.videoUrl) {
        setState((s) => ({ ...s, status: 'failed', error: 'Compose returned no url' }))
        return
      }
      if (state.storyId) updateComposedVideo(state.storyId, result.videoUrl)
      setState((s) => ({ ...s, status: 'done', progress: 100, downloadUrl: result.videoUrl, jobId }))
    },
    [state.storyId],
  )

  const onFailed = useCallback((_jobId: string, error: string) => {
    setState((s) => ({ ...s, status: 'failed', error }))
  }, [])

  const pending: PendingJob[] =
    state.status === 'rendering' && state.jobId && state.startedAt
      ? [{ jobId: state.jobId, startedAt: state.startedAt }]
      : []

  useJobPoller({ pending, onCompleted, onFailed })

  const startExport: Ctx['startExport'] = useCallback(async (storyId, scenes, opts) => {
    setState({ storyId, status: 'preparing', progress: 0 })
    try {
      const selected = scenes
        .map((s, i) => ({ s, i: i + 1 }))
        .filter(({ s }) => s.videoUrl)
        .filter(({ i }) => !opts.range || (i >= opts.range.from && i <= opts.range.to))
        .map(({ s }) => s)

      if (selected.length === 0) throw new Error('No scenes with video to export')

      const tracks: { sceneId: string; videoUrl: string; voiceoverUrl: string; duration: number }[] = []
      for (const s of selected) {
        let voiceoverUrl = s.voiceoverUrl
        if (!voiceoverUrl) {
          const res = await fetch('/api/voiceover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: s.voiceover, sceneId: s.id, storyId }),
          })
          if (!res.ok) throw new Error(`Voiceover failed (scene ${s.id})`)
          voiceoverUrl = ((await res.json()) as { url: string }).url
          updateStoryScene(storyId, s.id, { voiceoverUrl })
        }
        let duration = s.voiceoverDuration
        if (!duration) {
          duration = await probeAudioDuration(voiceoverUrl)
          updateStoryScene(storyId, s.id, { voiceoverDuration: duration })
        }
        tracks.push({ sceneId: s.id, videoUrl: s.videoUrl as string, voiceoverUrl, duration })
      }

      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, tracks, resolution: opts.resolution, includeIntro: opts.includeIntro }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      const { jobId } = (await res.json()) as { jobId: string }
      setState({ storyId, status: 'rendering', progress: 5, jobId, startedAt: Date.now() })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setState({ storyId, status: 'failed', progress: 0, error: msg })
      toast.error('Export failed', { description: msg })
    }
  }, [])

  const cancelExport: Ctx['cancelExport'] = useCallback(async () => {
    const jobId = state.jobId
    setState(initial)
    if (jobId) {
      try {
        await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
      } catch { /* best-effort */ }
    }
  }, [state.jobId])

  const reset = useCallback(() => setState(initial), [])

  const value = useMemo(() => ({ state, startExport, cancelExport, reset }), [state, startExport, cancelExport, reset])

  return <ExportCtx.Provider value={value}>{children}</ExportCtx.Provider>
}

export function useExportState(): Ctx {
  const v = useContext(ExportCtx)
  if (!v) throw new Error('useExportState must be inside <ExportStateProvider>')
  return v
}
