'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Scene } from '@/shared/lib/types'
import type { StoryExportHydration } from '@/features/stories/lib/story-export-view'
import { fetchStory, patchSceneFields } from '@/features/stories/client/stories-client'

export type ExportPhase = 'idle' | 'preparing' | 'rendering' | 'done' | 'failed'

export interface ExportOptions {
  resolution: '720p' | '1080p'
  includeIntro: boolean
  range?: { from: number; to: number }
}

export interface ExportState {
  storyId: string | null
  runId: string | null
  status: ExportPhase
  progress: number
  downloadUrl?: string
  error?: string
  retryable?: boolean
}

interface Ctx {
  state: ExportState
  startExport: (storyId: string, scenes: Scene[], opts: ExportOptions) => Promise<void>
  cancelExport: () => void
  retryExport: () => Promise<void>
  reset: () => void
  modalOpen: boolean
  openModal: () => void
  closeModal: () => void
}

const ExportCtx = createContext<Ctx | null>(null)
const initial: ExportState = { storyId: null, runId: null, status: 'idle', progress: 0 }

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

function stateFromHydration(storyId: string, hydration: StoryExportHydration): ExportState | null {
  if (hydration.status === 'aborted') return null
  if (hydration.status === 'running') {
    return { storyId, runId: hydration.runId, status: 'rendering', progress: 45 }
  }
  return {
    storyId,
    runId: hydration.runId,
    status: 'failed',
    progress: 0,
    error: hydration.error,
    retryable: hydration.retryable,
  }
}

interface ProviderProps {
  children: ReactNode
  storyId: string
  initialRun?: StoryExportHydration | null
  onComposedVideo?: (videoUrl: string) => void
}

export function ExportStateProvider({ children, storyId, initialRun, onComposedVideo }: ProviderProps) {
  const [state, setState] = useState<ExportState>(() => {
    if (!initialRun) return initial
    return stateFromHydration(storyId, initialRun) ?? initial
  })
  const [modalOpen, setModalOpen] = useState(false)
  const generationRef = useRef(0)
  // The generation an explicit cancel retired. A generation superseded by a
  // *newer start* is not cancelled — it is joined.
  const cancelledGenRef = useRef(0)
  const esRef = useRef<EventSource | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const onComposedVideoRef = useRef(onComposedVideo)
  onComposedVideoRef.current = onComposedVideo

  const isCurrent = useCallback((generation: number) => generationRef.current === generation, [])

  const cancelRun = useCallback((runId: string) => {
    void fetch(`/api/export/${runId}/cancel`, { method: 'POST' }).catch(() => {})
  }, [])

  /**
   * A start/retry that lost its generation while its POST was in flight.
   * Cancel is the only way to lose one and still owe the server something: the
   * Run was created after the user pressed Cancel, so nobody is watching it and
   * the next page load would hydrate it as composing. A newer start, by
   * contrast, joins this same Run — leave it alone.
   */
  const settleSupersededRun = useCallback((generation: number, runId: string) => {
    if (cancelledGenRef.current <= generation) return
    if (stateRef.current.runId === runId) return
    cancelRun(runId)
  }, [cancelRun])

  const closeStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])

  const regetStory = useCallback(async (): Promise<
    | { kind: 'running'; run: StoryExportHydration }
    | { kind: 'failed'; run: StoryExportHydration }
    | { kind: 'completed'; videoUrl: string }
    | { kind: 'idle' }
    | { kind: 'unknown' }
  > => {
    const data = await fetchStory(storyId)
    if (!data) return { kind: 'unknown' }
    if (data.exportRun?.status === 'running') return { kind: 'running', run: data.exportRun }
    if (data.exportRun?.status === 'failed') return { kind: 'failed', run: data.exportRun }
    if (data.exportRun?.status === 'aborted') return { kind: 'idle' }
    if (data.composedVideoUrl) {
      onComposedVideoRef.current?.(data.composedVideoUrl)
      return { kind: 'completed', videoUrl: data.composedVideoUrl }
    }
    return { kind: 'idle' }
  }, [storyId])

  const watchRun = useCallback((runId: string, generation: number) => {
    closeStream()

    const RECONNECT_DELAY = 1200

    return new Promise<void>((resolve, reject) => {
      const finish = (es: EventSource) => {
        es.close()
        if (esRef.current === es) esRef.current = null
      }

      const failIfStillCurrent = (err: Error) => {
        if (!isCurrent(generation)) return resolve()
        reject(err)
      }

      const connect = () => {
        if (!isCurrent(generation)) return resolve()

        const es = new EventSource(`/api/export/${runId}/stream`)
        esRef.current = es

        es.onmessage = (event) => {
          if (!isCurrent(generation)) {
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
            setState({
              storyId,
              runId,
              status: 'done',
              progress: 100,
              downloadUrl: data.videoUrl,
            })
            onComposedVideoRef.current?.(data.videoUrl)
            finish(es)
            resolve()
          } else if (data.status === 'failed') {
            finish(es)
            failIfStillCurrent(new Error(data.error ?? 'Export failed'))
          } else if (data.status === 'aborted') {
            finish(es)
            setState(initial)
            resolve()
          } else if (data.status === 'reconnect') {
            finish(es)
            setTimeout(connect, 100)
          } else if (data.status === 'progress') {
            setState((prev) =>
              isCurrent(generation) && prev.status === 'rendering'
                ? { ...prev, progress: Math.min(90, Math.max(prev.progress, 45)) }
                : prev,
            )
          }
        }

        es.onerror = () => {
          if (!isCurrent(generation)) {
            finish(es)
            return resolve()
          }
          finish(es)
          // A dropped stream is not a failed export. Re-get the Run; only fail
          // if the server says it failed.
          void regetStory()
            .then((result) => {
              if (!isCurrent(generation)) return resolve()
              if (result.kind === 'completed') {
                setState({
                  storyId,
                  runId,
                  status: 'done',
                  progress: 100,
                  downloadUrl: result.videoUrl,
                })
                return resolve()
              }
              if (result.kind === 'failed') {
                return failIfStillCurrent(new Error(result.run.error ?? 'Export failed'))
              }
              if (result.kind === 'idle') {
                setState(initial)
                return resolve()
              }
              setTimeout(connect, RECONNECT_DELAY)
            })
            .catch(() => {
              if (!isCurrent(generation)) return resolve()
              setTimeout(connect, RECONNECT_DELAY)
            })
        }
      }

      connect()
    })
  }, [closeStream, isCurrent, regetStory, storyId])

  const startWatching = useCallback(async (runId: string, generation: number) => {
    setState((prev) => ({
      ...prev,
      storyId,
      runId,
      status: 'rendering',
      progress: Math.max(prev.progress, 45),
      error: undefined,
    }))
    await watchRun(runId, generation)
  }, [storyId, watchRun])

  const startExport: Ctx['startExport'] = useCallback(async (exportStoryId, scenes, opts) => {
    generationRef.current += 1
    const generation = generationRef.current
    closeStream()

    setState({ storyId: exportStoryId, runId: null, status: 'preparing', progress: 0 })

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
        if (!isCurrent(generation)) return
        const s = selected[idx]
        let duration = s.voiceoverDuration ?? null
        if (!duration) {
          duration = await probeAudioDuration(s.voiceoverUrl!)
          void patchSceneFields(exportStoryId, s.id, { voiceoverDuration: duration })
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
          isCurrent(generation)
            ? { ...prev, progress: Math.round(((idx + 1) / selected.length) * 35) }
            : prev,
        )
      }

      if (!isCurrent(generation)) return
      setState((prev) => ({ ...prev, progress: 40 }))

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: exportStoryId,
          scenes: scenesForExport,
          resolution: opts.resolution,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      const started = (await res.json()) as { runId: string; status?: string; error?: string }
      if (!isCurrent(generation)) {
        settleSupersededRun(generation, started.runId)
        return
      }

      if (started.status === 'failed') {
        setState({
          storyId: exportStoryId,
          runId: started.runId,
          status: 'failed',
          progress: 0,
          error: started.error ?? 'Export failed',
          retryable: true,
        })
        toast.error('Export failed', { description: started.error ?? 'Export failed' })
        return
      }

      await startWatching(started.runId, generation)
    } catch (err) {
      if (!isCurrent(generation)) return
      const msg = err instanceof Error ? err.message : 'Export failed'
      setState((prev) => ({
        storyId: exportStoryId,
        runId: prev.runId,
        status: 'failed',
        progress: 0,
        error: msg,
        retryable: true,
      }))
      toast.error('Export failed', { description: msg })
    }
  }, [closeStream, isCurrent, settleSupersededRun, startWatching])

  const cancelExport: Ctx['cancelExport'] = useCallback(() => {
    const runId = stateRef.current.runId
    generationRef.current += 1
    cancelledGenRef.current = generationRef.current
    closeStream()
    setState(initial)
    // Cancel before the start POST came back: there is no Run id to cancel yet,
    // so the start itself settles the Run it created (see settleSupersededRun).
    if (runId) cancelRun(runId)
  }, [cancelRun, closeStream])

  const retryExport: Ctx['retryExport'] = useCallback(async () => {
    const runId = stateRef.current.runId
    if (!runId) {
      generationRef.current += 1
      closeStream()
      setState(initial)
      return
    }
    generationRef.current += 1
    const generation = generationRef.current
    closeStream()
    setState((prev) => ({ ...prev, status: 'rendering', progress: 45, error: undefined }))

    try {
      const res = await fetch(`/api/export/${runId}/retry`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const retried = (await res.json()) as { runId: string; status?: string; error?: string }
      if (!isCurrent(generation)) {
        settleSupersededRun(generation, retried.runId)
        return
      }
      if (retried.status === 'failed') {
        throw new Error(retried.error ?? 'Export failed')
      }
      await startWatching(retried.runId, generation)
    } catch (err) {
      if (!isCurrent(generation)) return
      const msg = err instanceof Error ? err.message : 'Export failed'
      setState((prev) => ({
        ...prev,
        status: 'failed',
        progress: 0,
        error: msg,
        retryable: true,
      }))
      toast.error('Export failed', { description: msg })
    }
  }, [closeStream, isCurrent, settleSupersededRun, startWatching])

  const reset = useCallback(() => {
    generationRef.current += 1
    closeStream()
    setState(initial)
  }, [closeStream])

  const hydratedRunId = useRef<string | null>(null)
  useEffect(() => {
    return () => {
      generationRef.current += 1
      esRef.current?.close()
      esRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!initialRun) return
    const next = stateFromHydration(storyId, initialRun)
    if (!next) return
    if (hydratedRunId.current === initialRun.runId && stateRef.current.status !== 'idle') return
    hydratedRunId.current = initialRun.runId
    generationRef.current += 1
    const generation = generationRef.current
    setState(next)
    if (initialRun.status === 'running') {
      void startWatching(initialRun.runId, generation).catch((err) => {
        if (!isCurrent(generation)) return
        const msg = err instanceof Error ? err.message : 'Export failed'
        setState({
          storyId,
          runId: initialRun.runId,
          status: 'failed',
          progress: 0,
          error: msg,
          retryable: true,
        })
      })
    }
  }, [initialRun, isCurrent, startWatching, storyId])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  const value = useMemo(
    () => ({ state, startExport, cancelExport, retryExport, reset, modalOpen, openModal, closeModal }),
    [state, startExport, cancelExport, retryExport, reset, modalOpen, openModal, closeModal],
  )

  return <ExportCtx.Provider value={value}>{children}</ExportCtx.Provider>
}

export function useExportState(): Ctx {
  const v = useContext(ExportCtx)
  if (!v) throw new Error('useExportState must be inside <ExportStateProvider>')
  return v
}
