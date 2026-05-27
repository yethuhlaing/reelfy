'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { TopBar } from '@/shared/layout/TopBar'
import { WorkspaceTopBar } from '@/features/workspace/components/WorkspaceTopBar'
import { WorkspaceProvider, useWorkspace } from '@/features/workspace/context/workspace-context'
import { SceneGrid } from '@/features/workspace/components/cards/SceneGrid'
import { VoiceoverBar } from '@/features/workspace/components/media/VoiceoverBar'
import { ThumbnailDrawer } from '@/features/workspace/components/drawers/ThumbnailDrawer'
import { SceneDrawer } from '@/features/workspace/components/drawers/SceneDrawer'
import { StickmanScribble } from '@/features/workspace/components/media/StickmanScribble'
import { GibberishText } from '@/features/workspace/components/media/GibberishText'
import { StageDetailsPopover } from '@/features/workspace/components/media/StageDetailsPopover'
import { STICKMAN_GIBBERISH } from '@/shared/data/gibberish-pool'
import { ExportStateProvider } from '@/features/workspace/context/export-state'
import { AudioPlayerProvider, useAudioPlayer } from '@/shared/ui/audio-player'
import { readSSE } from '@/shared/lib/sse'
import { clearPendingStory, getPendingStory } from '@/features/stories/server/pending-story'
import { fetchStory, patchSceneFields } from '@/features/stories/client/stories-client'
import { notifications } from '@/shared/lib/notifications'
import { shouldShowToastFor } from '@/shared/lib/utils'
import { usePathname } from 'next/navigation'
import { useJobPoller, type PendingJob } from '@/features/workspace/hooks/use-poller'
import type { AnimateResult, Job } from '@/shared/lib/jobs/types'
import type { GenerateOptions, Stage, StageId, StoryData } from '@/shared/lib/types'

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
  return (
    <AudioPlayerProvider>
      <WorkspaceInner storyId={storyId} category={category} />
    </AudioPlayerProvider>
  )
}

function WorkspaceInner({ storyId, category }: Props) {
  const { play, pause, setActiveItem, ref: audioPlayerRef } = useAudioPlayer<{ index: number }>()
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const search = useSearchParams()
  const startingFlag = search?.get('starting') === '1'
  const thumbFlag = search?.get('thumb') === '1'

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

  const isPlayingAllRef = useRef(false)
  const storyDataRef = useRef<StoryData | null>(null)
  const inflightVoiceover = useRef<Map<string, Promise<string>>>(new Map())
  const generateAbortRef = useRef<AbortController | null>(null)
  const voiceoverAbortRef = useRef<AbortController | null>(null)
  const playbackCleanupRef = useRef<(() => void) | null>(null)
  const startedRef = useRef(false)

  const setStoryData: React.Dispatch<React.SetStateAction<StoryData | null>> = (u) => {
    _setStoryData((prev) => {
      const next = typeof u === 'function' ? (u as (p: StoryData | null) => StoryData | null)(prev) : u
      storyDataRef.current = next
      return next
    })
  }

  useEffect(() => {
    if (startingFlag) {
      const pending = getPendingStory(storyId)
      if (pending) {
        setOptions(pending.options)
        setStoryInput(pending.storyInput)
      }
      return
    }

    let cancelled = false
    fetchStory(storyId)
      .then((data) => {
        if (cancelled || !data) return
        setStoryData(data.storyData)
        if (data.options) setOptions(data.options)
        setStoryInput(data.storyInput ?? '')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, startingFlag])

  useEffect(() => {
    if (!startingFlag || startedRef.current) return
    const pending = getPendingStory(storyId)
    if (!pending) return
    startedRef.current = true
    void runGenerate(pending.storyInput, pending.options)
    clearPendingStory(storyId)
    router.replace(`/${category}/story/${storyId}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingFlag, storyId])

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
          category,
          story: input,
          density: opts.density,
          style: opts.style,
          tone: opts.tone,
          imageModel: opts.imageModel,
          videoModel: opts.videoModel,
          videoQuality: opts.videoQuality,
          textModel: opts.textModel,
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        if (res.status === 402) {
          const body = await res.json().catch(() => null)
          const balance = body?.balance ?? 0
          toast.error('Not enough credits', { description: `You have ${balance} credits. Purchase more to generate stories.` })
          throw new Error('Insufficient credits')
        }
        if (res.status === 401) throw new Error('Please sign in to generate stories')
        throw new Error((await res.text()) || `HTTP ${res.status}`)
      }

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
          case 'insufficient_credits':
            toast.error('Not enough credits', {
              description: `Need ${evt.required} credit${evt.required !== 1 ? 's' : ''}, you have ${evt.balance}.`,
            })
            throw new Error(`Insufficient credits (need ${evt.required}, have ${evt.balance})`)
          case 'error':
            throw new Error(evt.error)
          case 'complete':
            break
        }
      }

      const finalData = storyDataRef.current
      if (finalData && !ctrl.signal.aborted) {
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
        notifications.add({
          type: 'generation-failed',
          storyId,
          message: `Generation failed: ${msg.slice(0, 80)}`,
          link: `/${category}/story/${storyId}`,
        })
      }
    } finally {
      setIsGenerating(false)
      if (generateAbortRef.current === ctrl) generateAbortRef.current = null
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
      playbackCleanupRef.current?.()
      playbackCleanupRef.current = null
      setPlayState({ isPlaying: true, currentIndex: index })
      try {
        let url = scene.voiceoverUrl
        if (!url) {
          url = await fetchVoiceoverUrl(scene.id, scene.voiceover)
          setStoryData((prev) =>
            prev
              ? { ...prev, scenes: prev.scenes.map((s) => (s.id === scene.id ? { ...s, voiceoverUrl: url } : s)) }
              : prev,
          )
        }
        if (!url) { setPlayState({ isPlaying: false, currentIndex: -1 }); return }

        const item = { id: scene.id, src: url, data: { index } }

        return new Promise<void>((resolve, reject) => {
          const audio = audioPlayerRef.current
          if (!audio) {
            resolve()
            return
          }

          const onLoadedMetadata = () => {
            const dur = audio.duration
            if (Number.isFinite(dur) && dur > 0) {
              void patchSceneFields(storyId, scene.id, { voiceoverDuration: dur })
              setStoryData((prev) =>
                prev
                  ? {
                      ...prev,
                      scenes: prev.scenes.map((s) =>
                        s.id === scene.id ? { ...s, voiceoverDuration: dur } : s,
                      ),
                    }
                  : prev,
              )
            }
            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
          }

          const onEnded = () => {
            cleanup()
            if (!isPlayingAllRef.current) setPlayState({ isPlaying: false, currentIndex: -1 })
            resolve()
          }

          const onError = () => {
            cleanup()
            setPlayState({ isPlaying: false, currentIndex: -1 })
            reject(new Error('Audio failed'))
          }

          const cleanup = () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
            audio.removeEventListener('ended', onEnded)
            audio.removeEventListener('error', onError)
            if (playbackCleanupRef.current === cleanup) {
              playbackCleanupRef.current = null
            }
          }

          playbackCleanupRef.current = cleanup

          audio.addEventListener('loadedmetadata', onLoadedMetadata)
          audio.addEventListener('ended', onEnded)
          audio.addEventListener('error', onError)

          void play(item).catch((err) => {
            cleanup()
            if (err instanceof DOMException && err.name === 'AbortError') {
              resolve()
              return
            }
            reject(err)
          })
        })
      } catch (err) {
        console.error(err)
        setPlayState({ isPlaying: false, currentIndex: -1 })
      }
    },
    [audioPlayerRef, fetchVoiceoverUrl, pause, play, storyId],
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
    playbackCleanupRef.current?.()
    playbackCleanupRef.current = null
    pause()
    void setActiveItem(null)
    setPlayState({ isPlaying: false, currentIndex: -1 })
  }

  const enqueueAnimate = async (sceneId: string) => {
    if (!storyData || !options) return
    const scene = storyData.scenes.find((s) => s.id === sceneId)
    if (!scene) return
    if (scene.pendingJobId) {
      toast.message('This scene is already animating')
      return
    }
    if (!scene.imageUrl) {
      toast.error('Generate an image first', { description: 'Use Regen image after adding an image prompt.' })
      return
    }
    if (!scene.motionPrompt?.trim()) {
      toast.error('Add a motion prompt', { description: 'Describe movement in the scene drawer.' })
      return
    }
    patchScene(sceneId, { lastError: undefined, videoUrl: undefined, pendingJobId: 'pending' })
    try {
      const res = await fetch('/api/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          sceneId,
          imageUrl: scene.imageUrl,
          motionPrompt: scene.motionPrompt,
          videoModel: options.videoModel,
          videoQuality: options.videoQuality,
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

  const patchScene = (sceneId: string, patch: Partial<import('@/shared/lib/types').Scene>) => {
    setStoryData((prev) =>
      prev
        ? { ...prev, scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)) }
        : prev,
    )
  }

  const retryVoice = async (sceneId: string) => {
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
    const scene = storyData?.scenes.find((s) => s.id === sceneId)
    if (!scene) return
    if (scene.pendingJobId) {
      toast.message('Wait for the current animation to finish')
      return
    }
    if (!scene.imagePrompt?.trim()) {
      toast.error('Add an image prompt', { description: 'Describe the still frame in the scene drawer.' })
      return
    }
    patchScene(sceneId, { imageUrl: null, videoUrl: null, lastError: undefined, pendingJobId: undefined })
    try {
      const res = await fetch('/api/scene/regen-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, sceneId }),
      })
      if (res.status === 402) {
        const d = (await res.json().catch(() => ({}))) as { balance?: number; required?: number }
        toast.error('Not enough credits', {
          description: `Need ${d.required ?? '?'} credits (balance: ${d.balance ?? 0})`,
        })
        return
      }
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      const d = (await res.json()) as { url: string }
      patchScene(sceneId, { imageUrl: d.url, videoUrl: null, lastError: undefined })
      toast.success(scene.imageUrl ? 'Image regenerated' : 'Image generated')
    } catch (err) {
      toast.error('Image failed', { description: err instanceof Error ? err.message : 'Try again' })
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
      readOnly={false}
      playState={playState}
      setPlayState={setPlayState}
      playScene={playScene}
      enqueueAnimate={enqueueAnimate}
      retryVoice={retryVoice}
      retryImage={retryImage}
    >
      <ExportStateProvider>
      <TopBar />
      <WorkspaceTopBar
        category={category}
        onPlayAll={playAll}
        onAnimateAll={animateAll}
        onToggleThumbnail={() => setThumbOpen((v) => !v)}
        onToggleDetails={() => setDetailsOpen((v) => !v)}
        onVoiceChange={async (voiceId) => {
          await fetch(`/api/stories/${storyId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voiceId }),
          })
          setOptions((prev) => prev ? { ...prev, voiceId } : prev)
          setStoryData((prev) =>
            prev
              ? { ...prev, scenes: prev.scenes.map((s) => ({ ...s, voiceoverUrl: null })) }
              : prev,
          )
        }}
        onRenamed={(t) => setStoryData((prev) => (prev ? { ...prev, title: t } : prev))}
        thumbnailOpen={thumbOpen}
      />

      <div className="border-b border-[var(--border)] px-5">
        <div className="inline-flex gap-[18px]">
          {(['scenes', 'script'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`cursor-pointer border-b-2 bg-transparent py-2.5 font-[var(--font-heading)] text-[0.85rem] font-semibold ${
                activeTab === t ? 'border-[var(--accent)] text-[var(--text)]' : 'border-transparent text-[var(--muted)]'
              }`}
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
      />

      <main className="flex-1 px-5 pb-[120px] pt-5">
        {isGenerating && (
          <div className="flex flex-col items-center gap-3.5 px-4 pb-2 pt-7">
            <StickmanScribble variant="large" />
            <GibberishText pool={STICKMAN_GIBBERISH} />
            <div className="text-[0.72rem] uppercase tracking-[0.04em] text-[var(--muted)]">{summarizeStages(stages, imageProgress)}</div>
          </div>
        )}
        {storyData ? (
          activeTab === 'scenes' ? (
            <SceneGrid
              scenes={storyData.scenes}
              playingIndex={playState.isPlaying ? playState.currentIndex : null}
              onSceneClick={openScene}
              onAnimateScene={enqueueAnimate}
              onRegenImageScene={retryImage}
              onPlayScene={playScene}
              readOnly={false}
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
            <div className="flex max-w-[760px] flex-col gap-3.5">
              {storyData.scenes.map((scene, i) => (
                <div key={scene.id} className="flex gap-3.5">
                  <span className="min-w-7 font-[var(--font-heading)] text-[var(--muted)]">{i + 1}</span>
                  <p className="text-[0.95rem]">{scene.voiceover}</p>
                </div>
              ))}
            </div>
          )
        ) : isGenerating ? null : (
          <div className="flex flex-col items-center gap-[18px] rounded-[18px] border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-5 py-[60px] text-center">
            <h3 className="font-[var(--font-heading)] text-2xl">Loading…</h3>
            <p className="max-w-[420px] text-[var(--muted)]">If this stays empty, the story may have been deleted.</p>
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
