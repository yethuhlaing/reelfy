'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Scene } from '@/shared/lib/types'
import { patchSceneFields } from '@/features/stories/client/stories-client'

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
  downloadUrl?: string
  error?: string
}

interface Ctx {
  state: ExportState
  startExport: (storyId: string, scenes: Scene[], opts: ExportOptions) => Promise<void>
  cancelExport: () => void
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
  const runIdRef = useRef(0)
  const esRef = useRef<EventSource | null>(null)

  const isRunActive = useCallback((runId: number) => runIdRef.current === runId, [])

  const closeStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])

  const startExport: Ctx['startExport'] = useCallback(async (storyId, scenes, opts) => {
    runIdRef.current += 1
    const runId = runIdRef.current
    closeStream()

    setState({ storyId, status: 'preparing', progress: 0 })

    try {
      const indexed = scenes.map((s, i) => ({ s, i: i + 1 }))
        .filter(({ i }) => !opts.range || (i >= opts.range.from && i <= opts.range.to))
      const selected = indexed.map(({ s }) => s)

      if (selected.length === 0) throw new Error('No scenes in range')

      const missing = selected.filter((s) => !s.voiceoverUrl)
      if (missing.length > 0) {
        throw new Error(`${missing.length} scene(s) missing voiceover — generate all voiceovers before exporting`)
      }

      const scenesForExport: Array<{
        sceneId: string
        visualUrl: string
        isAnimated: boolean
        voiceoverUrl: string
        duration: number
      }> = []

      for (let idx = 0; idx < selected.length; idx++) {
        if (!isRunActive(runId)) return
        const s = selected[idx]
        let duration = s.voiceoverDuration ?? null
        if (!duration) {
          duration = await probeAudioDuration(s.voiceoverUrl!)
          void patchSceneFields(storyId, s.id, { voiceoverDuration: duration })
        }
        const isAnimated = !!s.videoUrl
        scenesForExport.push({
          sceneId: s.id,
          visualUrl: (isAnimated ? s.videoUrl : s.imageUrl) as string,
          isAnimated,
          voiceoverUrl: s.voiceoverUrl!,
          duration,
        })
        setState((prev) =>
          isRunActive(runId)
            ? { ...prev, progress: Math.round(((idx + 1) / selected.length) * 35) }
            : prev,
        )
      }

      if (!isRunActive(runId)) return
      setState((prev) => ({ ...prev, progress: 40 }))

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          scenes: scenesForExport,
          resolution: opts.resolution,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      const { jobId } = (await res.json()) as { jobId: string }
      if (!isRunActive(runId)) return

      setState({ storyId, status: 'rendering', progress: 45 })

      // Render can outlive a single serverless function window, so the stream
      // closes itself periodically and we reconnect — resuming from Redis.
      // The browser connection lifetime is decoupled from render duration.
      const OVERALL_DEADLINE = Date.now() + 20 * 60 * 1000 // 20 min hard cap
      const RECONNECT_DELAY = 1200
      const MAX_ERR_RETRIES = 8

      await new Promise<void>((resolve, reject) => {
        let errRetries = 0

        const finish = (es: EventSource) => {
          es.close()
          if (esRef.current === es) esRef.current = null
        }

        const connect = () => {
          if (!isRunActive(runId)) return resolve()
          if (Date.now() > OVERALL_DEADLINE) {
            return reject(new Error('Export timed out'))
          }

          const es = new EventSource(`/api/export/${jobId}/stream`)
          esRef.current = es

          es.onmessage = (event) => {
            if (!isRunActive(runId)) {
              finish(es)
              return resolve()
            }
            let data: { status: string; videoUrl?: string; error?: string }
            try {
              data = JSON.parse(event.data as string)
            } catch {
              return
            }
            if (data.status === 'done' && data.videoUrl) {
              setState({ storyId, status: 'done', progress: 100, downloadUrl: data.videoUrl })
              finish(es)
              resolve()
            } else if (data.status === 'failed') {
              finish(es)
              reject(new Error(data.error ?? 'Export failed'))
            } else if (data.status === 'reconnect') {
              // Server ended its window on purpose — reconnect immediately.
              errRetries = 0
              finish(es)
              setTimeout(connect, 100)
            } else if (data.status === 'progress') {
              errRetries = 0 // heartbeat: connection healthy
            }
          }

          es.onerror = () => {
            if (!isRunActive(runId)) {
              finish(es)
              return resolve()
            }
            finish(es)
            errRetries += 1
            if (errRetries > MAX_ERR_RETRIES) {
              reject(new Error('Stream connection lost'))
              return
            }
            setTimeout(connect, RECONNECT_DELAY)
          }
        }

        connect()
      })
    } catch (err) {
      if (!isRunActive(runId)) return
      const msg = err instanceof Error ? err.message : 'Export failed'
      setState({ storyId, status: 'failed', progress: 0, error: msg })
      toast.error('Export failed', { description: msg })
    }
  }, [isRunActive, closeStream])

  const cancelExport: Ctx['cancelExport'] = useCallback(() => {
    runIdRef.current += 1
    closeStream()
    setState(initial)
  }, [closeStream])

  const reset = useCallback(() => {
    runIdRef.current += 1
    closeStream()
    setState(initial)
  }, [closeStream])

  const value = useMemo(
    () => ({ state, startExport, cancelExport, reset }),
    [state, startExport, cancelExport, reset],
  )

  return <ExportCtx.Provider value={value}>{children}</ExportCtx.Provider>
}

export function useExportState(): Ctx {
  const v = useContext(ExportCtx)
  if (!v) throw new Error('useExportState must be inside <ExportStateProvider>')
  return v
}
