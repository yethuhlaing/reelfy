'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { StoryInput } from '@/components/StoryInput'
import { SceneGrid } from '@/components/SceneGrid'
import { VoiceoverBar } from '@/components/VoiceoverBar'
import { StageList } from '@/components/StageList'
import { RecentStories } from '@/components/RecentStories'
import { ThumbnailSlot } from '@/components/ThumbnailSlot'
import { ExportButton } from '@/components/ExportButton'
import { readSSE } from '@/lib/sse'
import {
  deleteStory,
  getStory,
  latestStoryId,
  listStories,
  saveStory,
  updateStoryScene,
  updateThumbnail,
  type StoredStorySummary,
} from '@/lib/storage'
import { useJobPoller, type PendingJob } from '@/lib/jobs/use-poller'
import type { AnimateResult, Job } from '@/lib/jobs/types'
import type {
  StoryData,
  SceneDensity,
  StickStyle,
  VoiceTone,
  GenerateOptions,
  Stage,
  StageId,
} from '@/lib/types'

const INITIAL_STAGES: Stage[] = [
  { id: 'analyze', label: 'Analyze story', status: 'pending' },
  { id: 'plan', label: 'Plan scenes', status: 'pending' },
  { id: 'images', label: 'Generate images', status: 'pending' },
]

function newStoryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function Home() {
  const [storyInput, setStoryInput] = useState('')
  const [options, setOptions] = useState<GenerateOptions>({
    density: '12',
    style: 'expressive',
    tone: 'inspirational',
    imageModel: 'flux-schnell-fal',
    videoModel: 'ltx-video-fal',
    videoQuality: '1080p',
    textModel: 'gemini-2.5-flash',
  })
  const [storyId, setStoryId] = useState<string | null>(null)
  const [storyData, setStoryData] = useState<StoryData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES)
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'scenes' | 'script'>('scenes')
  const [playState, setPlayState] = useState<{
    isPlaying: boolean
    currentIndex: number
  }>({ isPlaying: false, currentIndex: -1 })
  const [recent, setRecent] = useState<StoredStorySummary[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingAllRef = useRef(false)
  const storyIdRef = useRef<string | null>(null)
  const storyDataRef = useRef<StoryData | null>(null)
  const inflightVoiceover = useRef<Map<string, Promise<string>>>(new Map())
  const generateAbortRef = useRef<AbortController | null>(null)
  const voiceoverAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    storyIdRef.current = storyId
  }, [storyId])
  useEffect(() => {
    storyDataRef.current = storyData
  }, [storyData])

  useEffect(() => {
    const id = latestStoryId()
    if (id) {
      const s = getStory(id)
      if (s) {
        setStoryId(s.id)
        setStoryInput(s.storyInput)
        setOptions(s.options)
        setStoryData(s.storyData)
      }
    }
    setRecent(listStories())
  }, [])

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
      const stid = storyIdRef.current
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
      if (stid) updateStoryScene(stid, sid, {
        videoUrl: result.videoUrl,
        pendingJobId: undefined,
        lastError: undefined,
      })
    },
    onFailed: (jobId, error) => {
      const sid = sceneByJobId(jobId)
      if (!sid) return
      const stid = storyIdRef.current
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
      if (stid) updateStoryScene(stid, sid, { pendingJobId: undefined, lastError: error })
    },
  })

  const handleGenerate = async () => {
    if (!storyInput.trim()) return

    const newId = newStoryId()
    setStoryId(newId)
    storyIdRef.current = newId
    setIsGenerating(true)
    setStoryData(null)
    setStages(INITIAL_STAGES)
    setImageProgress(null)
    inflightVoiceover.current.clear()

    generateAbortRef.current?.abort()
    const ctrl = new AbortController()
    generateAbortRef.current = ctrl

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: newId,
          story: storyInput,
          density: options.density,
          style: options.style,
          tone: options.tone,
          imageModel: options.imageModel,
          textModel: options.textModel,
        }),
        signal: ctrl.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }

      for await (const evt of readSSE(response)) {
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
            setStoryData((prev) =>
              prev ? { ...prev, thumbnailPrompt: evt.prompt } : prev
            )
            break
          case 'scene-planned':
            setStoryData((prev) =>
              prev ? { ...prev, scenes: [...prev.scenes, evt.scene] } : prev
            )
            break
          case 'scene-image':
            setStoryData((prev) =>
              prev
                ? {
                    ...prev,
                    scenes: prev.scenes.map((s) =>
                      s.id === evt.sceneId ? { ...s, imageUrl: evt.imageUrl } : s
                    ),
                  }
                : prev
            )
            break
          case 'scene-image-error':
            console.error('Scene image failed', evt.sceneId, evt.error)
            break
          case 'image-progress':
            setImageProgress({ done: evt.done, total: evt.total })
            break
          case 'cancelled':
            setStages((prev) =>
              prev.map((s) =>
                s.status === 'active' ? { ...s, status: 'error', detail: 'Cancelled' } : s,
              ),
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
        saveStory({ id: newId, storyInput, options, storyData: finalData })
        setRecent(listStories())
      }
    } catch (error) {
      const aborted =
        ctrl.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      if (aborted) {
        setStages((prev) =>
          prev.map((s) =>
            s.status === 'active' ? { ...s, status: 'error', detail: 'Cancelled' } : s,
          ),
        )
      } else {
        console.error('Failed to generate:', error)
        const msg = error instanceof Error ? error.message : 'Failed to generate story'
        setStages((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'error', detail: msg } : s))
        )
        alert(msg)
      }
    } finally {
      setIsGenerating(false)
      if (generateAbortRef.current === ctrl) generateAbortRef.current = null
    }
  }

  const handleCancelGenerate = () => {
    generateAbortRef.current?.abort()
  }

  const handleCancelVoiceover = () => {
    voiceoverAbortRef.current?.abort()
  }

  const handleStopStory = async () => {
    generateAbortRef.current?.abort()
    voiceoverAbortRef.current?.abort()
    const sid = storyIdRef.current
    if (!sid) return
    try {
      await fetch(`/api/stories/${sid}/cancel`, {
        method: 'POST',
      })
    } catch {
      // best-effort
    }
  }

  const fetchVoiceoverUrl = useCallback(
    async (sceneId: string, text: string, sid: string): Promise<string> => {
      const key = `${sid}:${sceneId}`
      const existing = inflightVoiceover.current.get(key)
      if (existing) return existing

      if (!voiceoverAbortRef.current || voiceoverAbortRef.current.signal.aborted) {
        voiceoverAbortRef.current = new AbortController()
      }
      const signal = voiceoverAbortRef.current.signal

      const promise = (async () => {
        const res = await fetch('/api/voiceover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sceneId, storyId: sid }),
          signal,
        })
        if (!res.ok) {
          const t = await res.text()
          throw new Error(t || 'Failed to generate voiceover')
        }
        const data = (await res.json()) as { url: string }
        return data.url
      })()

      inflightVoiceover.current.set(key, promise)
      try {
        return await promise
      } finally {
        inflightVoiceover.current.delete(key)
      }
    },
    []
  )

  const playScene = useCallback(
    async (index: number) => {
      const data = storyDataRef.current
      const sid = storyIdRef.current
      if (!data || !sid || index >= data.scenes.length) return

      const scene = data.scenes[index]

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setPlayState({ isPlaying: true, currentIndex: index })

      try {
        let url = scene.voiceoverUrl
        if (!url) {
          url = await fetchVoiceoverUrl(scene.id, scene.voiceover, sid)
          setStoryData((prev) =>
            prev
              ? {
                  ...prev,
                  scenes: prev.scenes.map((s) =>
                    s.id === scene.id ? { ...s, voiceoverUrl: url } : s
                  ),
                }
              : prev
          )
          updateStoryScene(sid, scene.id, { voiceoverUrl: url })
        }

        const audio = new Audio(url)
        audioRef.current = audio

        audio.onloadedmetadata = () => {
          const dur = audio.duration
          if (Number.isFinite(dur) && dur > 0) {
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
            updateStoryScene(sid, scene.id, { voiceoverDuration: dur })
          }
        }

        return new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            if (!isPlayingAllRef.current) {
              setPlayState({ isPlaying: false, currentIndex: -1 })
            }
            resolve()
          }
          audio.onerror = () => {
            setPlayState({ isPlaying: false, currentIndex: -1 })
            reject(new Error('Audio playback failed'))
          }
          audio.play().catch(reject)
        })
      } catch (error) {
        console.error('Playback error:', error)
        setPlayState({ isPlaying: false, currentIndex: -1 })
      }
    },
    [fetchVoiceoverUrl]
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
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayState({ isPlaying: false, currentIndex: -1 })
  }

  const handleSceneClick = (index: number) => {
    isPlayingAllRef.current = false
    playScene(index)
  }

  const patchScene = useCallback((sceneId: string, patch: Partial<typeof storyData extends null ? never : NonNullable<typeof storyData>['scenes'][number]>) => {
    const sid = storyIdRef.current
    setStoryData((prev) =>
      prev
        ? { ...prev, scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)) }
        : prev
    )
    if (sid) updateStoryScene(sid, sceneId, patch)
  }, [])

  const enqueueAnimate = async (sceneId: string) => {
    if (!storyData || !storyId) return
    const scene = storyData.scenes.find((s) => s.id === sceneId)
    if (!scene || !scene.imageUrl || !scene.motionPrompt) return

    patchScene(sceneId, { lastError: undefined, videoUrl: undefined, pendingJobId: 'pending' })
    try {
      const res = await fetch('/api/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          sceneId: scene.id,
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
      const msg = err instanceof Error ? err.message : 'Enqueue failed'
      patchScene(sceneId, { pendingJobId: undefined, lastError: msg })
    }
  }

  const handleAnimateScene = (sceneId: string) => {
    enqueueAnimate(sceneId)
  }

  const handleCancelAnimate = async (sceneId: string) => {
    const scene = storyData?.scenes.find((s) => s.id === sceneId)
    const jobId = scene?.pendingJobId
    if (!jobId || jobId === 'pending') {
      patchScene(sceneId, { pendingJobId: undefined })
      return
    }
    patchScene(sceneId, { pendingJobId: undefined, lastError: 'Cancelled' })
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
    } catch {
      // best-effort
    }
  }

  const handleAnimateAll = async () => {
    if (!storyData) return
    const scenes = storyData.scenes.filter(
      (s) => s.imageUrl && s.motionPrompt && !s.videoUrl && !s.pendingJobId,
    )
    await Promise.allSettled(scenes.map((s) => enqueueAnimate(s.id)))
  }

  const handleThumbnailGenerated = (url: string) => {
    const sid = storyIdRef.current
    if (!sid) return
    setStoryData((prev) => (prev ? { ...prev, thumbnailUrl: url } : prev))
    updateThumbnail(sid, url)
  }

  const handleSelectRecent = (id: string) => {
    if (id === storyId) return
    const s = getStory(id)
    if (!s) return
    stopPlayback()
    setStoryId(s.id)
    setStoryInput(s.storyInput)
    setOptions(s.options)
    setStoryData(s.storyData)
    setStages(INITIAL_STAGES)
    setImageProgress(null)
  }

  const handleDeleteRecent = (id: string) => {
    deleteStory(id)
    const next = listStories()
    setRecent(next)
    if (id === storyId) {
      stopPlayback()
      setStoryId(null)
      setStoryData(null)
      setStoryInput('')
    }
  }

  return (
    <main className="app-container">
      <div className="left-panel">
        <StoryInput
          storyInput={storyInput}
          onStoryChange={setStoryInput}
          options={options}
          onOptionsChange={setOptions}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        {(isGenerating || stages.some((s) => s.status !== 'pending')) && (
          <StageList
            stages={stages}
            imageProgress={imageProgress}
            onCancel={isGenerating ? handleCancelGenerate : undefined}
          />
        )}
        <RecentStories
          stories={recent}
          currentStoryId={storyId}
          onSelect={handleSelectRecent}
          onDelete={handleDeleteRecent}
        />
      </div>

      <div className="right-panel">
        {storyData ? (
          <>
            <div className="panel-header">
              <div className="story-title">
                <h2>{storyData.title}</h2>
                <p>{storyData.tagline}</p>
              </div>

              <ThumbnailSlot
                storyId={storyId}
                prompt={storyData.thumbnailPrompt}
                title={storyData.title}
                tagline={storyData.tagline}
                url={storyData.thumbnailUrl}
                onGenerated={handleThumbnailGenerated}
              />

              <div className="panel-controls">
                <div className="tabs">
                  <button
                    className={`tab ${activeTab === 'scenes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('scenes')}
                  >
                    Scenes
                  </button>
                  <button
                    className={`tab ${activeTab === 'script' ? 'active' : ''}`}
                    onClick={() => setActiveTab('script')}
                  >
                    Script
                  </button>
                </div>

                <button
                  className="play-all-btn"
                  onClick={playAll}
                  disabled={playState.isPlaying || storyData.scenes.length === 0}
                >
                  ▶ Play All
                </button>
                {storyId && (
                  <ExportButton storyId={storyId} scenes={storyData.scenes} />
                )}
                {(() => {
                  const hasInflight =
                    isGenerating ||
                    storyData.scenes.some((s) => !!s.pendingJobId)
                  if (!hasInflight) return null
                  return (
                    <button
                      type="button"
                      className="stop-story-btn"
                      onClick={handleStopStory}
                      title="Cancel all running work for this story"
                    >
                      ✕ Stop story
                    </button>
                  )
                })()}
                {(() => {
                  const total = storyData.scenes.filter((s) => s.imageUrl && s.motionPrompt).length
                  const done = storyData.scenes.filter((s) => !!s.videoUrl).length
                  const pending = storyData.scenes.filter((s) => !!s.pendingJobId).length
                  const noneToAnimate = storyData.scenes.every(
                    (s) => !s.imageUrl || !s.motionPrompt || !!s.videoUrl || !!s.pendingJobId,
                  )
                  return (
                    <button
                      className="animate-all-btn"
                      onClick={handleAnimateAll}
                      disabled={noneToAnimate}
                      title="Animate all scenes"
                    >
                      {pending > 0
                        ? `Animating ${done}/${total}…`
                        : '✦ Animate All'}
                    </button>
                  )
                })()}
              </div>
            </div>

            {activeTab === 'scenes' ? (
              <SceneGrid
                scenes={storyData.scenes}
                playingIndex={playState.isPlaying ? playState.currentIndex : null}
                onSceneClick={handleSceneClick}
                onAnimateScene={handleAnimateScene}
                onCancelAnimate={handleCancelAnimate}
              />
            ) : (
              <div className="script-view">
                {storyData.scenes.map((scene, index) => (
                  <div key={scene.id} className="script-item">
                    <span className="script-number">{index + 1}</span>
                    <p>{scene.voiceover}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <h3>Your story awaits</h3>
            <p>Enter your founder story on the left and click Generate to create your animated stickman video.</p>
          </div>
        )}
      </div>

      <VoiceoverBar
        scene={storyData?.scenes[playState.currentIndex] ?? null}
        currentIndex={playState.currentIndex}
        totalScenes={storyData?.scenes.length ?? 0}
        isPlaying={playState.isPlaying}
        onStop={() => {
          handleCancelVoiceover()
          stopPlayback()
        }}
      />
    </main>
  )
}
