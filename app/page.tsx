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
    density: '2',
    style: 'expressive',
    tone: 'inspirational',
    imageModel: 'flux-schnell-fal',
    videoModel: 'ltx-video-fal',
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
  const [animateProgress, setAnimateProgress] = useState<{ done: number; total: number } | null>(null)
  const [animatingSceneIds, setAnimatingSceneIds] = useState<Set<string>>(new Set())
  const [recent, setRecent] = useState<StoredStorySummary[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingAllRef = useRef(false)
  const storyIdRef = useRef<string | null>(null)
  const storyDataRef = useRef<StoryData | null>(null)
  const inflightVoiceover = useRef<Map<string, Promise<string>>>(new Map())

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

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: storyInput,
          density: options.density,
          style: options.style,
          tone: options.tone,
        }),
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
          case 'error':
            throw new Error(evt.error)
          case 'complete':
            break
        }
      }

      const finalData = storyDataRef.current
      if (finalData) {
        saveStory({ id: newId, storyInput, options, storyData: finalData })
        setRecent(listStories())
      }
    } catch (error) {
      console.error('Failed to generate:', error)
      const msg = error instanceof Error ? error.message : 'Failed to generate story'
      setStages((prev) =>
        prev.map((s) => (s.status === 'active' ? { ...s, status: 'error', detail: msg } : s))
      )
      alert(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const fetchVoiceoverUrl = useCallback(
    async (sceneId: string, text: string, sid: string): Promise<string> => {
      const key = `${sid}:${sceneId}`
      const existing = inflightVoiceover.current.get(key)
      if (existing) return existing

      const promise = (async () => {
        const res = await fetch('/api/voiceover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sceneId, storyId: sid }),
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

  const handleAnimateAll = async () => {
    if (!storyData || !storyId) return
    const scenes = storyData.scenes.filter((s) => s.imageUrl && s.motionPrompt && !s.videoUrl)
    if (scenes.length === 0) return

    setAnimateProgress({ done: 0, total: scenes.length })

    await Promise.allSettled(
      scenes.map(async (scene) => {
        try {
          const res = await fetch('/api/animate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storyId,
              sceneId: scene.id,
              imageUrl: scene.imageUrl,
              motionPrompt: scene.motionPrompt,
            }),
          })
          if (!res.ok) {
            const d = await res.json()
            console.error('Animate failed', scene.id, res.status, d)
            return
          }
          const { videoUrl } = (await res.json()) as { videoUrl: string }
          setStoryData((prev) =>
            prev
              ? {
                  ...prev,
                  scenes: prev.scenes.map((s) => (s.id === scene.id ? { ...s, videoUrl } : s)),
                }
              : prev
          )
          updateStoryScene(storyId, scene.id, { videoUrl })
        } finally {
          setAnimateProgress((prev) => prev ? { ...prev, done: prev.done + 1 } : prev)
        }
      })
    )

    setAnimateProgress(null)
  }

  const handleAnimateScene = async (sceneId: string) => {
    if (!storyData || !storyId) return
    const scene = storyData.scenes.find((s) => s.id === sceneId)
    if (!scene || !scene.imageUrl || !scene.motionPrompt || scene.videoUrl) return

    setAnimatingSceneIds((prev) => new Set(prev).add(sceneId))
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
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        console.error('Animate failed', scene.id, res.status, d)
        return
      }
      const { videoUrl } = (await res.json()) as { videoUrl: string }
      setStoryData((prev) =>
        prev
          ? { ...prev, scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, videoUrl } : s)) }
          : prev
      )
      updateStoryScene(storyId, sceneId, { videoUrl })
    } finally {
      setAnimatingSceneIds((prev) => {
        const next = new Set(prev)
        next.delete(sceneId)
        return next
      })
    }
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
          <StageList stages={stages} imageProgress={imageProgress} />
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
                <button
                  className="animate-all-btn"
                  onClick={handleAnimateAll}
                  disabled={
                    !!animateProgress ||
                    storyData.scenes.every((s) => !s.imageUrl || !s.motionPrompt || !!s.videoUrl)
                  }
                  title="Animate all scenes with LTX-Video"
                >
                  {animateProgress
                    ? `Animating ${animateProgress.done}/${animateProgress.total}…`
                    : '✦ Animate All'}
                </button>
              </div>
            </div>

            {activeTab === 'scenes' ? (
              <SceneGrid
                scenes={storyData.scenes}
                playingIndex={playState.isPlaying ? playState.currentIndex : null}
                onSceneClick={handleSceneClick}
                onAnimateScene={handleAnimateScene}
                animatingSceneIds={animatingSceneIds}
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
        onStop={stopPlayback}
      />
    </main>
  )
}
