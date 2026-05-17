'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AdvancedConfig } from './AdvancedConfig'
import type { GenerateOptions } from '@/lib/types'
import { savePendingStory } from '@/lib/storage'

const DEFAULTS: GenerateOptions = {
  density: '12',
  style: 'expressive',
  tone: 'inspirational',
  imageModel: 'flux-schnell-fal',
  videoModel: 'ltx-video-fal',
  videoQuality: '1080p',
  textModel: 'gemini-2.5-flash',
}

const STORAGE_PREFIX = 'new-story:options:'

function newStoryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function StoryForm({ category }: { category: string }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [options, setOptions] = useState<GenerateOptions>(DEFAULTS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + category)
      if (raw) setOptions({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch { /* ignore */ }
  }, [category])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + category, JSON.stringify(options))
    } catch { /* ignore */ }
  }, [options, category])

  const submit = async () => {
    const trimmed = text.trim()
    if (trimmed.length < 20) {
      setError('Story needs at least 20 characters to plan scenes.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const id = newStoryId()
      savePendingStory({
        id,
        category,
        storyInput: trimmed,
        options,
        createdAt: Date.now(),
      })
      toast.success('Cooking your story…')
      router.push(`/${category}/story/${id}?starting=1`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start'
      setError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="form-shell">
      <div>
        <span className="chip">◈ {category}</span>
        <h1 style={{ marginTop: 10 }}>New story</h1>
      </div>

      <div className="field">
        <label htmlFor="story" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Your story</label>
        <textarea
          id="story"
          placeholder="Drop the story. Founder journey, narrative, anything. The wilder the better."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
        />
      </div>

      <button className="advanced-toggle" onClick={() => setShowAdvanced((v) => !v)} type="button">
        <ChevronRight size={14} style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 140ms ease' }} />
        Advanced
      </button>
      {showAdvanced && (
        <AdvancedConfig value={options} onChange={setOptions} disabled={submitting} />
      )}

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="cost-preview-slot" />

      <button
        className="icon-btn icon-btn--primary"
        onClick={submit}
        disabled={submitting || !text.trim()}
        style={{ height: 46, justifyContent: 'center', fontSize: '0.95rem' }}
      >
        <Sparkles size={16} />
        {submitting ? 'Starting…' : 'Generate Story'}
      </button>
    </div>
  )
}
