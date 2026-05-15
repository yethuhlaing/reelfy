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
            <option value="8">Quick (8 scenes)</option>
            <option value="10">Light (10 scenes)</option>
            <option value="12">Standard (12 scenes)</option>
            <option value="16">Medium (16 scenes)</option>
            <option value="20">Dense (20 scenes)</option>
            <option value="25">Extra Dense (25 scenes)</option>
            <option value="30">Long (30 scenes)</option>
            <option value="35">Extended (35 scenes)</option>
            <option value="40">Full (40 scenes)</option>
            <option value="45">Epic (45 scenes)</option>
            <option value="50">Maximum (50 scenes)</option>
            <option value="55">Ultra (55 scenes)</option>
            <option value="60">Ultimate (60 scenes)</option>
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
          <label htmlFor="textModel">Script Model</label>
          <select
            id="textModel"
            value={options.textModel}
            onChange={(e) => onOptionsChange({ ...options, textModel: e.target.value as GenerateOptions['textModel'] })}
            disabled={isGenerating}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (default)</option>
            <option value="nvidia/nemotron-ultra-253b-v1">NVIDIA Nemotron Ultra 253B — free</option>
            <option value="nvidia/nemotron-3-nano-30b-a3b">NVIDIA Nemotron Nano 30B — free tier</option>
            <option value="nvidia/nemotron-nano-9b-v2">NVIDIA Nemotron Nano 9B — $0.04/1M</option>
            <option value="nvidia/llama-3.3-nemotron-super-49b-v1.5">NVIDIA Llama 3.3 49B — $0.10/1M</option>
            <option value="nvidia/nemotron-nano-12b-v2">NVIDIA Nemotron Nano 12B — $0.20/1M</option>
            <option value="nvidia/llama-3.1-nemotron-70b-instruct">NVIDIA Llama 3.1 70B — $0.60/1M</option>
            <option value="nvidia/mixtral-8x22b-instruct-v0.1">NVIDIA Mixtral 8x22B — $1.20/1M</option>
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
