'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Scene } from '@/shared/lib/types'
import type { ComposeResult, Job } from '@/shared/lib/jobs/types'
import { useJobPoller, type PendingJob } from '@/features/workspace/hooks/use-poller'
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
const RESOLUTION_SIZE: Record<ExportOptions['resolution'], string> = {
  '720p': '1280:720',
  '1080p': '1920:1080',
}
let ffmpegLoadPromise: Promise<{
  ffmpeg: import('@ffmpeg/ffmpeg').FFmpeg
  loaded: boolean
}> | null = null

function extensionFromMime(contentType: string | null): string {
  if (!contentType) return 'jpg'
  const ct = contentType.toLowerCase()
  if (ct.includes('png')) return 'png'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('gif')) return 'gif'
  return 'jpg'
}

async function fetchBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Asset download failed: HTTP ${res.status}`)
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get('content-type'),
  }
}

async function getFFmpeg() {
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import('@ffmpeg/ffmpeg'), import('@ffmpeg/util')])
      const ffmpeg = new FFmpeg()
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
      const [coreURL, wasmURL, workerURL] = await Promise.all([
        toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      ])
      await ffmpeg.load({ coreURL, wasmURL, workerURL })
      return { ffmpeg, loaded: true }
    })()
  }
  return ffmpegLoadPromise
}

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
  const isRunActive = useCallback((runId: number) => runIdRef.current === runId, [])

  const onCompleted = useCallback(
    (jobId: string, job: Job) => {
      const result = job.result as ComposeResult | undefined
      if (!result?.videoUrl) {
        setState((s) => (s.jobId === jobId ? { ...s, status: 'failed', error: 'Compose returned no url' } : s))
        return
      }
      setState((s) => {
        if (s.jobId !== jobId) return s
        return { ...s, status: 'done', progress: 100, downloadUrl: result.videoUrl, jobId }
      })
    },
    [],
  )

  const onFailed = useCallback((jobId: string, error: string) => {
    setState((s) => (s.jobId === jobId ? { ...s, status: 'failed', error } : s))
  }, [])

  const pending: PendingJob[] =
    state.status === 'rendering' && state.jobId && state.startedAt
      ? [{ jobId: state.jobId, startedAt: state.startedAt }]
      : []

  useJobPoller({ pending, onCompleted, onFailed })

  const startExport: Ctx['startExport'] = useCallback(async (storyId, scenes, opts) => {
    runIdRef.current += 1
    const runId = runIdRef.current
    setState((prev) => {
      if (prev.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.downloadUrl)
      return { storyId, status: 'preparing', progress: 0 }
    })
    try {
      const isStatic = scenes.every((s) => !s.videoUrl)
      const indexed = scenes.map((s, i) => ({ s, i: i + 1 }))
        .filter(({ i }) => !opts.range || (i >= opts.range.from && i <= opts.range.to))
      const selected = indexed
        .map(({ s }) => s)
        .filter((s) => (isStatic ? !!s.imageUrl : !!s.videoUrl))

      if (selected.length === 0) {
        throw new Error(isStatic ? 'No scenes with images to export' : 'No scenes with video to export')
      }

      const tracks: { sceneId: string; mediaUrl: string; voiceoverUrl: string; duration: number }[] = []
      for (let idx = 0; idx < selected.length; idx += 1) {
        const s = selected[idx]
        if (!isRunActive(runId)) return
        let voiceoverUrl = s.voiceoverUrl
        if (!voiceoverUrl) {
          const res = await fetch('/api/voiceover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: s.voiceover, sceneId: s.id, storyId }),
          })
          if (!res.ok) throw new Error(`Voiceover failed (scene ${s.id})`)
          voiceoverUrl = ((await res.json()) as { url: string }).url
        }
        let duration = s.voiceoverDuration
        if (!duration) {
          duration = await probeAudioDuration(voiceoverUrl)
          void patchSceneFields(storyId, s.id, { voiceoverDuration: duration })
        }
        tracks.push({
          sceneId: s.id,
          mediaUrl: (isStatic ? s.imageUrl : s.videoUrl) as string,
          voiceoverUrl,
          duration,
        })
        const prepPct = Math.round(((idx + 1) / selected.length) * 40)
        setState((prev) => (isRunActive(runId) ? { ...prev, status: 'preparing', progress: prepPct } : prev))
      }

      if (!isRunActive(runId)) return
      if (isStatic) {
        setState((prev) => ({ ...prev, status: 'rendering', progress: 45 }))
        const { ffmpeg } = await getFFmpeg()
        if (!isRunActive(runId)) return

        const scale = RESOLUTION_SIZE[opts.resolution]
        const clipFiles: string[] = []
        const audioFiles: string[] = []

        for (let i = 0; i < tracks.length; i += 1) {
          const t = tracks[i]
          const [{ bytes: imageBytes, contentType: imageType }, { bytes: audioBytes }] = await Promise.all([
            fetchBytes(t.mediaUrl),
            fetchBytes(t.voiceoverUrl),
          ])
          if (!isRunActive(runId)) return

          const imageFile = `scene_${i}.${extensionFromMime(imageType)}`
          const audioFile = `audio_${i}.mp3`
          const clipFile = `clip_${i}.mp4`
          await ffmpeg.writeFile(imageFile, imageBytes)
          await ffmpeg.writeFile(audioFile, audioBytes)

          const clipRc = await ffmpeg.exec([
            '-loop', '1',
            '-framerate', '30',
            '-i', imageFile,
            '-t', `${Math.max(0.1, t.duration)}`,
            '-vf', `scale=${scale},format=yuv420p`,
            '-r', '30',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            clipFile,
          ])
          if (clipRc !== 0) throw new Error(`Static clip render failed (${i + 1}/${tracks.length})`)
          clipFiles.push(clipFile)
          audioFiles.push(audioFile)

          const renderPct = 45 + Math.round(((i + 1) / tracks.length) * 45)
          setState((prev) => (isRunActive(runId) ? { ...prev, status: 'rendering', progress: renderPct } : prev))
        }

        if (!isRunActive(runId)) return
        const concatInputs = tracks.map((_t, i) => `[${i * 2}:v][${i * 2 + 1}:a]`).join('')
        const outputFile = 'output.mp4'
        const concatRc = await ffmpeg.exec([
          ...clipFiles.flatMap((f) => ['-i', f]),
          ...audioFiles.flatMap((f) => ['-i', f]),
          '-filter_complex', `${concatInputs}concat=n=${tracks.length}:v=1:a=1[outv][outa]`,
          '-map', '[outv]',
          '-map', '[outa]',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-shortest',
          outputFile,
        ])
        if (concatRc !== 0) throw new Error('Static final compose failed')
        setState((prev) => (isRunActive(runId) ? { ...prev, status: 'rendering', progress: 95 } : prev))

        const output = await ffmpeg.readFile(outputFile)
        const bytes = typeof output === 'string' ? new TextEncoder().encode(output) : new Uint8Array(output)
        const normalizedBytes = new Uint8Array(bytes.byteLength)
        normalizedBytes.set(bytes)
        const url = URL.createObjectURL(new Blob([normalizedBytes], { type: 'video/mp4' }))
        setState((prev) => (isRunActive(runId)
          ? { ...prev, status: 'done', progress: 100, downloadUrl: url, jobId: undefined, startedAt: undefined }
          : prev))
        return
      }

      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          tracks: tracks.map((t) => ({
            sceneId: t.sceneId,
            videoUrl: t.mediaUrl,
            voiceoverUrl: t.voiceoverUrl,
            duration: t.duration,
          })),
          resolution: opts.resolution,
          includeIntro: opts.includeIntro,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      const { jobId } = (await res.json()) as { jobId: string }
      if (!isRunActive(runId)) return
      setState({ storyId, status: 'rendering', progress: 5, jobId, startedAt: Date.now() })
    } catch (err) {
      if (!isRunActive(runId)) return
      const msg = err instanceof Error ? err.message : 'Export failed'
      setState({ storyId, status: 'failed', progress: 0, error: msg })
      toast.error('Export failed', { description: msg })
    }
  }, [isRunActive])

  const cancelExport: Ctx['cancelExport'] = useCallback(async () => {
    runIdRef.current += 1
    setState((prev) => {
      if (prev.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.downloadUrl)
      return initial
    })
  }, [])

  const reset = useCallback(() => {
    runIdRef.current += 1
    setState((prev) => {
      if (prev.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.downloadUrl)
      return initial
    })
  }, [])

  const value = useMemo(() => ({ state, startExport, cancelExport, reset }), [state, startExport, cancelExport, reset])

  return <ExportCtx.Provider value={value}>{children}</ExportCtx.Provider>
}

export function useExportState(): Ctx {
  const v = useContext(ExportCtx)
  if (!v) throw new Error('useExportState must be inside <ExportStateProvider>')
  return v
}
