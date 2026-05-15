'use client'

import { useState, useCallback, useRef } from 'react'
import { StoryInput } from '@/components/StoryInput'
import { SceneGrid } from '@/components/SceneGrid'
import { VoiceoverBar } from '@/components/VoiceoverBar'
import { ProgressBar } from '@/components/ProgressBar'
import type { StoryData, SceneDensity, StickStyle, VoiceTone } from '@/lib/types'

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
  const [storyData, setStoryData] = useState<StoryData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ pct: 0, label: '' })
  const [activeTab, setActiveTab] = useState<'scenes' | 'script'>('scenes')
  const [playState, setPlayState] = useState<{
    isPlaying: boolean
    currentIndex: number
  }>({ isPlaying: false, currentIndex: -1 })
  const [audioCache] = useState<Map<string, string>>(() => new Map())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingAllRef = useRef(false)

  const handleGenerate = async () => {
    if (!storyInput.trim()) return

    setIsGenerating(true)
    setProgress({ pct: 10, label: 'Analyzing your story...' })

    try {
      setProgress({ pct: 30, label: 'Generating scenes with AI...' })

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

      setProgress({ pct: 80, label: 'Processing SVG scenes...' })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setProgress({ pct: 100, label: 'Complete!' })
      setStoryData(result.data)
    } catch (error) {
      console.error('Failed to generate:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate story')
    } finally {
      setIsGenerating(false)
      setProgress({ pct: 0, label: '' })
    }
  }

  const playScene = useCallback(
    async (index: number) => {
      if (!storyData || index >= storyData.scenes.length) return

      const scene = storyData.scenes[index]

      // Stop current audio if any
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setPlayState({ isPlaying: true, currentIndex: index })

      try {
        let audioUrl = audioCache.get(scene.id)

        if (!audioUrl) {
          const response = await fetch('/api/voiceover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: scene.voiceover,
              sceneId: scene.id,
            }),
          })

          if (!response.ok) {
            throw new Error('Failed to generate voiceover')
          }

          const audioBlob = await response.blob()
          audioUrl = URL.createObjectURL(audioBlob)
          audioCache.set(scene.id, audioUrl)
        }

        const audio = new Audio(audioUrl)
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
    [storyData, audioCache]
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
        {isGenerating && <ProgressBar progress={progress} />}
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
                  disabled={playState.isPlaying}
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
