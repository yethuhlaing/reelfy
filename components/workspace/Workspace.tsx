'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { TopBar } from '@/components/layout/TopBar'
import { WorkspaceTopBar } from '@/components/workspace/WorkspaceTopBar'
import { WorkspaceProvider, useWorkspace } from '@/context/workspace-context'
import { SceneGrid } from '@/components/workspace/cards/SceneGrid'
import { VoiceoverBar } from '@/components/workspace/media/VoiceoverBar'
import { ThumbnailDrawer } from '@/components/workspace/drawers/ThumbnailDrawer'
import { SceneDrawer } from '@/components/workspace/drawers/SceneDrawer'
import { StickmanScribble } from '@/components/workspace/media/StickmanScribble'
import { GibberishText } from '@/components/workspace/media/GibberishText'
import { StageDetailsPopover } from '@/components/workspace/media/StageDetailsPopover'
import { STICKMAN_GIBBERISH } from '@/data/gibberish-pool'
import { ExportStateProvider } from '@/context/export-state'
import { readSSE } from '@/lib/sse'
import {
  clearPendingStory,
  getPendingStory,
  getStory,
  saveStory,
  updateStoryScene,
} from '@/lib/storage'
import { SAMPLE_STORY, SAMPLE_STORY_ID } from '@/data/sample-story'
import { notifications } from '@/lib/notifications'
import { shouldShowToastFor } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useJobPoller, type PendingJob } from '@/hooks/use-poller'
import type { AnimateResult, Job } from '@/lib/jobs/types'
import type { GenerateOptions, Stage, StageId, StoryData } from '@/lib/types'

const INITIAL_STAGES: Stage[] = [
  { id: 'analyze', label: 'Analyze story', status: 'pending' },
  { id: 'plan', label: 'Plan scenes', status: 'pending' },
  { id: 'images', label: 'Generate images', status: 'pending' },
]

interface Props {
  storyId: string
  category: string
}

export function Workspace({ storyId, category }: Props) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const search = useSearchParams()
  const startingFlag = search?.get('starting') === '1'
  const thumbFlag = search?.get('thumb') === '1'

  const readOnly = storyId === SAMPLE_STORY_ID

  const [storyData, _setStoryData] = useState<StoryData | null>(null)
  const [storyInput, setStoryInput] = useState('')
  const [options, setOptions] = useState<GenerateOptions | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES)
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'scenes' | 'script'>('scenes')
  const [playState, setPlayState] = useState({ isPlaying: false, currentIndex: -1 })
  const [thumbOpen, setThumbOpen] = useState(thumbFlag)
  const [sceneDrawerOpen, setSceneDrawerOpen] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingAllRef = useRef(false)
  const storyDataRef = useRef<StoryData | null>(null)
  const inflightVoiceover = useRef<Map<string, Promise<string>>>(new Map())
  const generateAbortRef = useRef<AbortController | null>(null)
  const voiceoverAbortRef = useRef<AbortController | null>(null)
  const startedRef = useRef(false)

  const setStoryData: React.Dispatch<React.SetStateAction<StoryData | null>> = (u) => {
    _setStoryData((prev) => {
      const next = typeof u === 'function' ? (u as (p: StoryData | null) => StoryData | null)(prev) : u
      storyDataRef.current = next
      return next
    })
  }

  useEffect(() => {
    if (readOnly) {
      setStoryData(SAMPLE_STORY.storyData)
      setOptions(SAMPLE_STORY.options)
      setStoryInput(SAMPLE_STORY.storyInput)
      return
    }
    const existing = getStory(storyId)
    if (existing) {
      setStoryData(existing.storyData)
      setOptions(existing.options)
      setStoryInput(existing.storyInput)
    } else if (startingFlag) {
      const pending = getPendingStory(storyId)
      if (pending) {
        setOptions(pending.options)
        setStoryInput(pending.storyInput)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId])

  useEffect(() => {
    if (readOnly || !startingFlag || startedRef.current) return
    const pending = getPendingStory(storyId)
    if (!pending) return
    startedRef.current = true
    void runGenerate(pending.storyInput, pending.options)
    clearPendingStory(storyId)
    router.replace(`/${category}/story/${storyId}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingFlag, readOnly, storyId])

  const updateStage = (id: StageId, patch: Partial<Stage>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const jobStartedAtRef = useRef<Map<string, number>>(new Map())
  const pendingAnimateJobs: PendingJob[] = (storyData?.scenes ?? [])
    .filter((s) => s.pendingJobId && s.pendingJobId !== 'pending')
    .map((s) => {
      const jobId = s.pendingJobId as string
      const map = jobStartedAtRef.current
      if (!map.has(jobId)) map.set(jobId, Date.now())
      return { jobId, startedAt: map.get(jobId) as number }
    })

  const sceneByJobId = (jobId: string): string | null => {
    const scene = storyData?.scenes.find((s) => s.pendingJobId === jobId)
    return scene?.id ?? null
  }

  useJobPoller({
    pending: pendingAnimateJobs,
    onCompleted: (jobId, job: Job) => {
      const sid = sceneByJobId(jobId)
      if (!sid) return
      const result = job.result as AnimateResult | undefined
      if (!result?.videoUrl) return
      setStoryData((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.map((s) =>
                s.id === sid
                  ? { ...s, videoUrl: result.videoUrl, pendingJobId: undefined, lastError: undefined }
                  : s,
              ),
            }
          : prev,
      )
      if (!readOnly) updateStoryScene(storyId, sid, {
        videoUrl: result.videoUrl, pendingJobId: undefined, lastError: undefined,
      })
      if (!readOnly) {
        const idx = storyDataRef.current?.scenes.findIndex((s) => s.id === sid) ?? -1
        const link = `/${category}/story/${storyId}`
        notifications.add({
          type: 'scene-animated',
          storyId,
          sceneId: sid,
          message: `Scene ${idx + 1} animated`,
          link,
        })
        if (shouldShowToastFor(storyId, pathname, !document.hidden)) {
          toast.success(`Scene ${idx + 1} animated`, { action: { label: 'Open', onClick: () => router.push(link) } })
        }
      }
    },
    onFailed: (jobId, error) => {
      const sid = sceneByJobId(jobId)
      if (!sid) return
      setStoryData((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.map((s) =>
                s.id === sid ? { ...s, pendingJobId: undefined, lastError: error } : s,
              ),
            }
          : prev,
      )
      if (!readOnly) updateStoryScene(storyId, sid, { pendingJobId: undefined, lastError: error })
      if (!readOnly) {
        const idx = storyDataRef.current?.scenes.findIndex((s) => s.id === sid) ?? -1
        const link = `/${category}/story/${storyId}`
        notifications.add({
          type: 'scene-failed',
          storyId,
          sceneId: sid,
          message: `Scene ${idx + 1} failed: ${error.slice(0, 80)}`,
          link,
        })
        if (shouldShowToastFor(storyId, pathname, !document.hidden)) {
          toast.error(`Scene ${idx + 1} failed`, { description: error })
        }
      }
    },
  })

  const runGenerate = async (input: string, opts: GenerateOptions) => {
    setIsGenerating(true)
    setStoryData(null)
    setStages(INITIAL_STAGES)
    setImageProgress(null)
    inflightVoiceover.current.clear()

    generateAbortRef.current?.abort()
    const ctrl = new AbortController()
    generateAbortRef.current = ctrl

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          story: input,
          density: opts.density,
          style: opts.style,
          tone: opts.tone,
          imageModel: opts.imageModel,
          textModel: opts.textModel,
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)

      for await (const evt of readSSE(res)) {
        switch (evt.type) {
          case 'stage':
            updateStage(evt.id as StageId, { status: evt.status, detail: evt.detail })
            break
          case 'story':
            setStoryData({
              title: evt.title,
              tagline: evt.tagline,
              protagonist: evt.protagonist,
              thumbnailPrompt: null,
              thumbnailUrl: null,
              scenes: [],
            })
            break
          case 'thumbnail-prompt':
            setStoryData((prev) => (prev ? { ...prev, thumbnailPrompt: evt.prompt } : prev))
            break
          case 'scene-planned':
            setStoryData((prev) => (prev ? { ...prev, scenes: [...prev.scenes, evt.scene] } : prev))
            break
          case 'scene-image':
            setStoryData((prev) =>
              prev
                ? {
                    ...prev,
                    scenes: prev.scenes.map((s) =>
                      s.id === evt.sceneId ? { ...s, imageUrl: evt.imageUrl } : s,
                    ),
                  }
                : prev,
            )
            break
          case 'image-progress':
            setImageProgress({ done: evt.done, total: evt.total })
            break
          case 'cancelled':
            setStages((prev) =>
              prev.map((s) => (s.status === 'active' ? { ...s, status: 'error', detail: 'Cancelled' } : s)),
            )
            break
          case 'error':
            throw new Error(evt.error)
          case 'complete':
            break
        }
      }

      const finalData = storyDataRef.current
      if (finalData && !ctrl.signal.aborted) {
        saveStory({ id: storyId, storyInput: input, options: opts, storyData: finalData, category })
        if (!readOnly) {
          const link = `/${category}/story/${storyId}`
          notifications.add({
            type: 'generation-complete',
            storyId,
            message: `Story "${finalData.title}" ready`,
            link,
          })
          if (shouldShowToastFor(storyId, pathname, !document.hidden)) {
            toast.success('Story ready', { action: { label: 'Open', onClick: () => router.push(link) } })
          }
        }
      }
    } catch (err) {
      const aborted = ctrl.signal.aborted || (err instanceof Error && err.name === 'AbortError')
      if (aborted) {
        setStages((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'error', detail: 'Cancelled' } : s)),
        )
      } else {
        const msg = err instanceof Error ? err.message : 'Generation failed'
        setStages((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'error', detail: msg } : s)),
        )
        toast.error('Generation failed', { description: msg })
        if (!readOnly) {
          notifications.add({
            type: 'generation-failed',
            storyId,
            message: `Generation failed: ${msg.slice(0, 80)}`,
            link: `/${category}/story/${storyId}`,
          })
        }
      }
    } finally {
      setIsGenerating(false)
      if (generateAbortRef.current === ctrl) generateAbortRef.current = null
    }
  }

  const handleStop = async () => {
    generateAbortRef.current?.abort()
    voiceoverAbortRef.current?.abort()
    try {
      await fetch(`/api/stories/${storyId}/cancel`, { method: 'POST' })
      toast.success('Stopped')
    } catch {
      toast.error('Failed to stop fully')
    }
  }

  const fetchVoiceoverUrl = useCallback(
    async (sceneId: string, text: string): Promise<string> => {
      const key = `${storyId}:${sceneId}`
      const existing = inflightVoiceover.current.get(key)
      if (existing) return existing
      if (!voiceoverAbortRef.current || voiceoverAbortRef.current.signal.aborted) {
        voiceoverAbortRef.current = new AbortController()
      }
      const signal = voiceoverAbortRef.current.signal
      const p = (async () => {
        const res = await fetch('/api/voiceover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sceneId, storyId }),
          signal,
        })
        if (!res.ok) throw new Error((await res.text()) || 'Voiceover failed')
        const data = (await res.json()) as { url: string }
        return data.url
      })()
      inflightVoiceover.current.set(key, p)
      try { return await p } finally { inflightVoiceover.current.delete(key) }
    },
    [storyId],
  )

  const playScene = useCallback(
    async (index: number) => {
      const data = storyDataRef.current
      if (!data || index >= data.scenes.length) return
      const scene = data.scenes[index]
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      setPlayState({ isPlaying: true, currentIndex: index })
      try {
        let url = scene.voiceoverUrl
        if (!url && !readOnly) {
          url = await fetchVoiceoverUrl(scene.id, scene.voiceover)
          setStoryData((prev) =>
            prev
              ? { ...prev, scenes: prev.scenes.map((s) => (s.id === scene.id ? { ...s, voiceoverUrl: url } : s)) }
              : prev,
          )
          updateStoryScene(storyId, scene.id, { voiceoverUrl: url })
        }
        if (!url) { setPlayState({ isPlaying: false, currentIndex: -1 }); return }
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onloadedmetadata = () => {
          const dur = audio.duration
          if (Number.isFinite(dur) && dur > 0 && !readOnly) {
            updateStoryScene(storyId, scene.id, { voiceoverDuration: dur })
          }
        }
        return new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            if (!isPlayingAllRef.current) setPlayState({ isPlaying: false, currentIndex: -1 })
            resolve()
          }
          audio.onerror = () => { setPlayState({ isPlaying: false, currentIndex: -1 }); reject(new Error('Audio failed')) }
          audio.play().catch(reject)
        })
      } catch (err) {
        console.error(err)
        setPlayState({ isPlaying: false, currentIndex: -1 })
      }
    },
    [fetchVoiceoverUrl, readOnly, storyId],
  )

  const playAll = async () => {
    if (!storyData) return
    isPlayingAllRef.current = true
    for (let i = 0; i < storyData.scenes.length; i++) {
      if (!isPlayingAllRef.current) break
      await playScene(i)
    }
    isPlayingAllRef.current = false
    setPlayState({ isPlaying: false, currentIndex: -1 })
  }

  const stopPlayback = () => {
    isPlayingAllRef.current = false
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPlayState({ isPlaying: false, currentIndex: -1 })
  }

  const enqueueAnimate = async (sceneId: string) => {
    if (!storyData || !options || readOnly) return
    const scene = storyData.scenes.find((s) => s.id === sceneId)
    if (!scene || !scene.imageUrl || !scene.motionPrompt) return
    patchScene(sceneId, { lastError: undefined, videoUrl: undefined, pendingJobId: 'pending' })
    try {
      const res = await fetch('/api/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId, sceneId, imageUrl: scene.imageUrl, motionPrompt: scene.motionPrompt,
          videoModel: options.videoModel, videoQuality: options.videoQuality,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        patchScene(sceneId, { pendingJobId: undefined, lastError: d.error ?? `HTTP ${res.status}` })
        return
      }
      const { jobId } = (await res.json()) as { jobId: string }
      patchScene(sceneId, { pendingJobId: jobId })
    } catch (err) {
      patchScene(sceneId, { pendingJobId: undefined, lastError: err instanceof Error ? err.message : 'Enqueue failed' })
    }
  }

  const patchScene = (sceneId: string, patch: Parameters<typeof updateStoryScene>[2]) => {
    setStoryData((prev) =>
      prev
        ? { ...prev, scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)) }
        : prev,
    )
    if (!readOnly) updateStoryScene(storyId, sceneId, patch)
  }

  const cancelAnimate = async (sceneId: string) => {
    const scene = storyData?.scenes.find((s) => s.id === sceneId)
    const jobId = scene?.pendingJobId
    if (!jobId || jobId === 'pending') { patchScene(sceneId, { pendingJobId: undefined }); return }
    patchScene(sceneId, { pendingJobId: undefined, lastError: 'Cancelled' })
    try { await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' }) } catch { /* best-effort */ }
  }

  const retryVoice = async (sceneId: string) => {
    if (readOnly) return
    const scene = storyData?.scenes.find((s) => s.id === sceneId)
    if (!scene) return
    patchScene(sceneId, { voiceoverUrl: null, voiceoverDuration: undefined })
    try {
      const url = await fetchVoiceoverUrl(sceneId, scene.voiceover)
      patchScene(sceneId, { voiceoverUrl: url })
      toast.success('Voiceover refreshed')
    } catch (err) {
      toast.error('Voiceover failed', { description: err instanceof Error ? err.message : 'Try again' })
    }
  }

  const retryImage = async (sceneId: string) => {
    if (readOnly) return
    try {
      const res = await fetch('/api/scene/regen-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, sceneId }),
      })
      if (res.status === 501) {
        toast.message('Regen image — coming soon')
        return
      }
      if (!res.ok) throw new Error(await res.text())
      const d = (await res.json()) as { url: string }
      patchScene(sceneId, { imageUrl: d.url })
      toast.success('Image regenerated')
    } catch (err) {
      toast.error('Regen failed', { description: err instanceof Error ? err.message : 'Try again' })
    }
  }

  const animateAll = async () => {
    if (!storyData) return
    const scenes = storyData.scenes.filter((s) => s.imageUrl && s.motionPrompt && !s.videoUrl && !s.pendingJobId)
    await Promise.allSettled(scenes.map((s) => enqueueAnimate(s.id)))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (thumbOpen) url.searchParams.set('thumb', '1')
    else url.searchParams.delete('thumb')
    const next = url.pathname + (url.search ? url.search : '')
    if (next !== window.location.pathname + window.location.search) {
      router.replace(next, { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbOpen])

  const openScene = (index: number) => {
    const s = storyData?.scenes[index]
    if (!s) return
    setActiveSceneId(s.id)
    setSceneDrawerOpen(true)
  }

  return (
    <WorkspaceProvider
      storyId={storyId}
      storyData={storyData}
      setStoryData={setStoryData}
      options={options}
      isGenerating={isGenerating}
      setIsGenerating={setIsGenerating}
      readOnly={readOnly}
      playState={playState}
      setPlayState={setPlayState}
      audioRef={audioRef}
      playScene={playScene}
      enqueueAnimate={enqueueAnimate}
      cancelAnimate={cancelAnimate}
      retryVoice={retryVoice}
      retryImage={retryImage}
    >
      <ExportStateProvider>
      <TopBar />
      <WorkspaceTopBar
        category={category}
        onPlayAll={playAll}
        onAnimateAll={animateAll}
        onStop={handleStop}
        onToggleThumbnail={() => setThumbOpen((v) => !v)}
        onToggleDetails={() => setDetailsOpen((v) => !v)}
        onRenamed={(t) => setStoryData((prev) => (prev ? { ...prev, title: t } : prev))}
        thumbnailOpen={thumbOpen}
      />

      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        <div style={{ display: 'inline-flex', gap: 18 }}>
          {(['scenes', 'script'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                color: activeTab === t ? 'var(--text)' : 'var(--muted)',
                borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              {t === 'scenes' ? 'Scenes' : 'Script'}
            </button>
          ))}
        </div>
      </div>

      <StageDetailsPopover
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        stages={stages}
        imageProgress={imageProgress}
        onCancel={isGenerating ? handleStop : undefined}
      />

      <main style={{ padding: 20, paddingBottom: 120, flex: 1 }}>
        {isGenerating && (
          <div className="workspace-loading">
            <StickmanScribble variant="large" />
            <GibberishText pool={STICKMAN_GIBBERISH} />
            <div className="stage-summary">{summarizeStages(stages, imageProgress)}</div>
          </div>
        )}
        {storyData ? (
          activeTab === 'scenes' ? (
            <SceneGrid
              scenes={storyData.scenes}
              playingIndex={playState.isPlaying ? playState.currentIndex : null}
              onSceneClick={openScene}
              onAnimateScene={readOnly ? undefined : enqueueAnimate}
              onCancelAnimate={readOnly ? undefined : cancelAnimate}
              onPlayScene={playScene}
              readOnly={readOnly}
              skeletonCount={
                isGenerating && options ? Number.parseInt(options.density, 10) || 0 : 0
              }
              jobStartedAt={(sid) => {
                const s = storyData?.scenes.find((x) => x.id === sid)
                const jid = s?.pendingJobId
                return jid && jid !== 'pending' ? jobStartedAtRef.current.get(jid) : undefined
              }}
            />
          ) : (
            <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {storyData.scenes.map((scene, i) => (
                <div key={scene.id} style={{ display: 'flex', gap: 14 }}>
                  <span style={{ color: 'var(--muted)', minWidth: 28, fontFamily: 'var(--font-heading)' }}>{i + 1}</span>
                  <p style={{ fontSize: '0.95rem' }}>{scene.voiceover}</p>
                </div>
              ))}
            </div>
          )
        ) : isGenerating ? null : (
          <div className="empty-dash">
            <h3>Loading…</h3>
            <p>If this stays empty, the story may have been deleted.</p>
          </div>
        )}
      </main>

      <VoiceoverBar
        scene={storyData?.scenes[playState.currentIndex] ?? null}
        currentIndex={playState.currentIndex}
        totalScenes={storyData?.scenes.length ?? 0}
        isPlaying={playState.isPlaying}
        onStop={() => { voiceoverAbortRef.current?.abort(); stopPlayback() }}
      />

      <ThumbnailDrawer open={thumbOpen} onClose={() => setThumbOpen(false)} />
      <SceneDrawer
        open={sceneDrawerOpen}
        onClose={() => setSceneDrawerOpen(false)}
        onAnimate={enqueueAnimate}
        onCancelAnimate={cancelAnimate}
        onPlay={(i) => { setSceneDrawerOpen(false); playScene(i) }}
      />
      {/* expose active id to provider via effect */}
      <ActiveSceneSync activeSceneId={activeSceneId} />
      </ExportStateProvider>
    </WorkspaceProvider>
  )
}

function summarizeStages(stages: Stage[], imageProgress: { done: number; total: number } | null): string {
  const active = stages.find((s) => s.status === 'active')
  if (active) {
    if (active.id === 'images' && imageProgress) {
      return `Generating images ${imageProgress.done}/${imageProgress.total}`
    }
    return active.label
  }
  const erroredCount = stages.filter((s) => s.status === 'error').length
  if (erroredCount > 0) return `${erroredCount} stage error`
  return 'Working...'
}

function ActiveSceneSync({ activeSceneId }: { activeSceneId: string | null }) {
  const { setActiveSceneId } = useWorkspace()
  useEffect(() => { setActiveSceneId(activeSceneId) }, [activeSceneId, setActiveSceneId])
  return null
}
