'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getStory, updateComposedVideo, updateStoryScene } from '@/lib/storage'
import type { Scene } from '@/lib/types'
import type { ComposeResult, Job } from '@/lib/jobs/types'
import { useJobPoller, type PendingJob } from '@/lib/jobs/use-poller'
import { toast } from 'sonner'

interface ExportButtonProps {
  storyId: string
  scenes: Scene[]
}

type ExportState =
  | { phase: 'idle' }
  | { phase: 'preparing' }
  | { phase: 'queued'; jobId: string; startedAt: number }
  | { phase: 'done'; url: string }
  | { phase: 'error'; message: string }

async function assertAudioReachable(url: string): Promise<void> {
  const probeResponse = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  })
  if (!probeResponse.ok) {
    throw new Error(`Audio HTTP ${probeResponse.status}`)
  }
  const audioBuffer = await probeResponse.arrayBuffer()
  if (audioBuffer.byteLength < 256) {
    throw new Error('Audio file is empty or truncated')
  }
}

async function probeAudioDuration(url: string): Promise<number> {
  await assertAudioReachable(url)

  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) resolve(audio.duration)
      else reject(new Error('Invalid audio duration'))
    }
    audio.onerror = () => reject(new Error('Failed to load audio metadata'))
    audio.src = url
  })
}

function extractStatusCode(message: string): string | null {
  const match = message.match(/\b(\d{3})\b/)
  return match?.[1] ?? null
}

export function ExportButton({ storyId, scenes }: ExportButtonProps) {
  const [state, setState] = useState<ExportState>({ phase: 'idle' })
  const prepareAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const stored = getStory(storyId)
    if (stored?.composedVideoUrl) setState({ phase: 'done', url: stored.composedVideoUrl })
    else setState({ phase: 'idle' })
  }, [storyId])

  const composable = scenes.filter((s) => s.videoUrl)
  const isWorking = state.phase === 'preparing' || state.phase === 'queued'

  const showExportError = useCallback((message: string) => {
    setState({ phase: 'error', message })
    const code = extractStatusCode(message)
    toast.error(code ? `Export failed (${code})` : 'Export failed', {
      description: message,
    })
  }, [])

  const onCompleted = useCallback(
    (jobId: string, job: Job) => {
      const result = job.result as ComposeResult | undefined
      if (!result?.videoUrl) {
        showExportError('Compose returned no url')
        return
      }
      updateComposedVideo(storyId, result.videoUrl)
      setState({ phase: 'done', url: result.videoUrl })
      void jobId
    },
    [showExportError, storyId],
  )

  const onFailed = useCallback((jobId: string, error: string) => {
    showExportError(error)
    void jobId
  }, [showExportError])

  const pending: PendingJob[] =
    state.phase === 'queued' ? [{ jobId: state.jobId, startedAt: state.startedAt }] : []

  useJobPoller({ pending, onCompleted, onFailed })

  const handleExport = async () => {
    prepareAbortRef.current?.abort()
    const ctrl = new AbortController()
    prepareAbortRef.current = ctrl
    const signal = ctrl.signal
    setState({ phase: 'preparing' })
    try {
      const tracks: { sceneId: string; videoUrl: string; voiceoverUrl: string; duration: number }[] = []
      for (const s of composable) {
        if (signal.aborted) throw new DOMException('aborted', 'AbortError')
        const requestVoiceover = async (): Promise<string> => {
          const voiceRes = await fetch('/api/voiceover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: s.voiceover,
              sceneId: s.id,
              storyId,
            }),
            signal,
          })
          if (!voiceRes.ok) {
            const d = await voiceRes.json().catch(() => ({}))
            throw new Error(d.error ?? `Voiceover HTTP ${voiceRes.status} (scene ${s.id})`)
          }
          const voiceData = (await voiceRes.json()) as { url?: string }
          if (!voiceData.url) throw new Error(`Voiceover generation returned no url (scene ${s.id})`)
          return voiceData.url
        }

        let voiceoverUrl = s.voiceoverUrl
        if (!voiceoverUrl) {
          voiceoverUrl = await requestVoiceover()
          updateStoryScene(storyId, s.id, { voiceoverUrl })
        }

        // Verify every URL before compose; stale/broken blob URLs cause fal.ai 422.
        try {
          await assertAudioReachable(voiceoverUrl)
        } catch {
          voiceoverUrl = await requestVoiceover()
          updateStoryScene(storyId, s.id, { voiceoverUrl })
          await assertAudioReachable(voiceoverUrl)
        }

        let duration = s.voiceoverDuration
        if (!duration || duration <= 0) {
          duration = await probeAudioDuration(voiceoverUrl).catch(async () => {
            voiceoverUrl = await requestVoiceover()
            updateStoryScene(storyId, s.id, { voiceoverUrl })
            return probeAudioDuration(voiceoverUrl)
          })
          updateStoryScene(storyId, s.id, { voiceoverDuration: duration })
        }

        tracks.push({
          sceneId: s.id,
          videoUrl: s.videoUrl as string,
          voiceoverUrl,
          duration,
        })
      }

      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, tracks }),
        signal,
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        showExportError(d.error ?? `HTTP ${res.status}`)
        return
      }
      const { jobId } = (await res.json()) as { jobId: string }
      setState({ phase: 'queued', jobId, startedAt: Date.now() })
    } catch (err) {
      if (
        signal.aborted ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        setState({ phase: 'idle' })
        return
      }
      showExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      if (prepareAbortRef.current === ctrl) prepareAbortRef.current = null
    }
  }

  const handleCancelExport = async () => {
    prepareAbortRef.current?.abort()
    if (state.phase === 'queued') {
      const jobId = state.jobId
      setState({ phase: 'idle' })
      try {
        await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
      } catch {
        // best-effort
      }
    } else if (state.phase === 'preparing') {
      setState({ phase: 'idle' })
    }
  }

  return (
    <div className="export-slot">
      {state.phase === 'error' && <span className="export-error">{state.message}</span>}
      {state.phase === 'done' && (
        <a
          href={state.url}
          download={`story-${storyId}.mp4`}
          className="export-download-btn"
        >
          ↓ Download MP4
        </a>
      )}
      <button
        className="export-btn"
        onClick={handleExport}
        disabled={isWorking || composable.length === 0}
        title={
          composable.length === 0
            ? 'Animate scenes first'
            : `Export ${composable.length} scene${composable.length === 1 ? '' : 's'} as MP4`
        }
      >
        {state.phase === 'preparing'
          ? 'Preparing…'
          : state.phase === 'queued'
            ? 'Composing…'
            : state.phase === 'done'
              ? '⬇ Export MP4'
              : '⬇ Export MP4'}
      </button>
      {isWorking && (
        <button
          type="button"
          className="export-cancel-btn"
          onClick={handleCancelExport}
          title="Cancel export"
        >
          ✕
        </button>
      )}
    </div>
  )
}
