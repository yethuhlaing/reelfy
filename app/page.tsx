'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { StoryInput } from '@/components/StoryInput'
import { SceneGrid } from '@/components/SceneGrid'
import { VoiceoverBar } from '@/components/VoiceoverBar'
import { StageList } from '@/components/StageList'
import { RecentStories } from '@/components/RecentStories'
import { readSSE } from '@/lib/sse'
import {
  deleteStory,
  getStory,
  latestStoryId,
  listStories,
  saveStory,
  updateStoryScene,
  type StoredStorySummary,
} from '@/lib/storage'
import type {
  StoryData,
  SceneDensity,
  StickStyle,
  VoiceTone,
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
  const [options, setOptions] = useState<{
    density: SceneDensity
    style: StickStyle
    tone: VoiceTone
  }>({
    density: '2',
    style: 'expressive',
    tone: 'inspirational',
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
            setStoryData({ title: evt.title, tagline: evt.tagline, scenes: [] })
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
              </div>
            </div>

            {activeTab === 'scenes' ? (
              <SceneGrid
                scenes={storyData.scenes}
                playingIndex={playState.isPlaying ? playState.currentIndex : null}
                onSceneClick={handleSceneClick}
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
