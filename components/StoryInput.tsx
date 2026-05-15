'use client'

import type { SceneDensity, StickStyle, VoiceTone, GenerateOptions } from '@/lib/types'

interface StoryInputProps {
  storyInput: string
  onStoryChange: (value: string) => void
  options: GenerateOptions
  onOptionsChange: (options: GenerateOptions) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function StoryInput({
  storyInput,
  onStoryChange,
  options,
  onOptionsChange,
  onGenerate,
  isGenerating,
}: StoryInputProps) {
  return (
    <div className="story-input-panel">
      <div className="logo">
        <span className="logo-icon">◈</span>
        <h1>StickStory</h1>
      </div>

      <p className="tagline">Transform your startup journey into animated stickman scenes</p>

      <div className="input-group">
        <label htmlFor="story">Your Founder Story</label>
        <textarea
          id="story"
          placeholder="Tell us your startup story... From the first idea to where you are now. Include the highs, the lows, and the pivotal moments."
          value={storyInput}
          onChange={(e) => onStoryChange(e.target.value)}
          disabled={isGenerating}
        />
      </div>

      <div className="options-grid">
        <div className="option">
          <label htmlFor="density">Scene Density</label>
          <select
            id="density"
            value={options.density}
            onChange={(e) => onOptionsChange({ ...options, density: e.target.value as SceneDensity })}
            disabled={isGenerating}
          >
            <option value="1">Light (8-12 scenes)</option>
            <option value="2">Medium (10-16 scenes)</option>
            <option value="3">Dense (14-20 scenes)</option>
          </select>
        </div>

        <div className="option">
          <label htmlFor="style">Stick Style</label>
          <select
            id="style"
            value={options.style}
            onChange={(e) => onOptionsChange({ ...options, style: e.target.value as StickStyle })}
            disabled={isGenerating}
          >
            <option value="minimal">Minimal</option>
            <option value="expressive">Expressive</option>
            <option value="dramatic">Dramatic</option>
          </select>
        </div>

        <div className="option">
          <label htmlFor="tone">Voice Tone</label>
          <select
            id="tone"
            value={options.tone}
            onChange={(e) => onOptionsChange({ ...options, tone: e.target.value as VoiceTone })}
            disabled={isGenerating}
          >
            <option value="inspirational">Inspirational</option>
            <option value="casual">Casual</option>
            <option value="documentary">Documentary</option>
            <option value="pitch">Pitch</option>
          </select>
        </div>

        <div className="option">
          <label htmlFor="imageModel">Image Model</label>
          <select
            id="imageModel"
            value={options.imageModel}
            onChange={(e) => onOptionsChange({ ...options, imageModel: e.target.value as GenerateOptions['imageModel'] })}
            disabled={isGenerating}
          >
            <option value="flux-schnell-fal">Flux Schnell — fast · $0.003</option>
            <option value="sdxl-lightning-fal">SDXL Lightning — fastest · $0.002</option>
            <option value="flux-dev-fal">Flux Dev — quality · $0.04</option>
          </select>
        </div>

        <div className="option">
          <label htmlFor="videoModel">Video Model</label>
          <select
            id="videoModel"
            value={options.videoModel}
            onChange={(e) => onOptionsChange({ ...options, videoModel: e.target.value as GenerateOptions['videoModel'] })}
            disabled={isGenerating}
          >
            <option value="ltx-video-fal">LTX Video — fast · $0.02</option>
            <option value="longcat-fal">LongCat — balanced · $0.03</option>
            <option value="kling-fal">Kling v2.6 — quality · $0.05</option>
          </select>
        </div>
      </div>

      <button
        className="generate-btn"
        onClick={onGenerate}
        disabled={isGenerating || !storyInput.trim()}
      >
        {isGenerating ? (
          <>
            <span className="spinner" />
            Generating...
          </>
        ) : (
          <>
            <span className="btn-icon">✦</span>
            Generate Story
          </>
        )}
      </button>
    </div>
  )
}
