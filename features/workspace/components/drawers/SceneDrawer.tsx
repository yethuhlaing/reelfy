'use client'

import { useEffect, useState } from 'react'
import { Play, RefreshCw, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from './Drawer'
import { useWorkspace } from '@/features/workspace/context/workspace-context'
import { patchSceneFields } from '@/features/stories/client/stories-client'
import type { Scene } from '@/shared/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onAnimate?: (sceneId: string) => void
  onPlay?: (index: number) => void
}

export function SceneDrawer({ open, onClose, onAnimate, onPlay }: Props) {
  const { storyId, storyData, activeSceneId, patchScene, readOnly, retryImage } = useWorkspace()
  const scene = storyData?.scenes.find((s) => s.id === activeSceneId) ?? null
  const idx = storyData?.scenes.findIndex((s) => s.id === activeSceneId) ?? -1

  const [imagePrompt, setImagePrompt] = useState('')
  const [voiceover, setVoiceover] = useState('')
  const [motion, setMotion] = useState('')

  useEffect(() => {
    if (scene) {
      setImagePrompt(scene.imagePrompt ?? '')
      setVoiceover(scene.voiceover)
      setMotion(scene.motionPrompt ?? '')
    }
  }, [scene?.id, scene])

  if (!scene) return null

  const commit = () => {
    const localPatch: Partial<Scene> = {}
    const apiPatch: {
      imagePrompt?: string
      voiceover?: string
      motionPrompt?: string | null
    } = {}

    if (imagePrompt !== (scene.imagePrompt ?? '')) {
      localPatch.imagePrompt = imagePrompt
      apiPatch.imagePrompt = imagePrompt
    }
    if (voiceover !== scene.voiceover) {
      localPatch.voiceover = voiceover
      apiPatch.voiceover = voiceover
    }
    if (motion !== (scene.motionPrompt ?? '')) {
      localPatch.motionPrompt = motion || undefined
      apiPatch.motionPrompt = motion || null
    }

    if (Object.keys(localPatch).length) {
      patchScene(scene.id, localPatch)
    }
    if (storyId && Object.keys(apiPatch).length) {
      void patchSceneFields(storyId, scene.id, apiPatch)
    }
  }

  const handleRegenImage = () => {
    if (readOnly) return
    if (scene.pendingJobId) {
      toast.message('Wait for the current animation to finish')
      return
    }
    if (!imagePrompt.trim()) {
      toast.error('Add an image prompt', { description: 'Describe the still frame above.' })
      return
    }
    commit()
    retryImage?.(scene.id)
  }

  const handleAnimate = () => {
    if (readOnly) return
    if (scene.pendingJobId) {
      toast.message('This scene is already animating')
      return
    }
    if (!scene.imageUrl) {
      toast.error('Generate an image first', { description: 'Run Regen image after the image prompt is set.' })
      return
    }
    if (!motion.trim()) {
      toast.error('Add a motion prompt', { description: 'Describe movement, camera, and mood.' })
      return
    }
    commit()
    onAnimate?.(scene.id)
  }

  return (
    <Drawer open={open} onClose={onClose} title={`Scene ${idx + 1} — ${scene.sentence.slice(0, 40)}${scene.sentence.length > 40 ? '…' : ''}`}>
      <div className="mb-3.5 overflow-hidden rounded-[10px] bg-[var(--surface2)]">
        {scene.videoUrl ? (
          <video src={scene.videoUrl} controls className="block w-full" />
        ) : scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.imageUrl} alt={scene.sentence} className="block w-full" />
        ) : (
          <div className="grid aspect-video place-items-center text-[var(--muted)]">Generating…</div>
        )}
      </div>

      <Section label="Image prompt">
        <textarea
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          onBlur={commit}
          disabled={readOnly}
          placeholder="Describe the still frame: character, setting, composition, style…"
          style={ta}
        />
      </Section>

      <Section label="Voiceover">
        <textarea
          value={voiceover}
          onChange={(e) => setVoiceover(e.target.value)}
          onBlur={commit}
          disabled={readOnly}
          style={ta}
        />
      </Section>

      <Section label="Motion prompt">
        <textarea
          value={motion}
          onChange={(e) => setMotion(e.target.value)}
          onBlur={commit}
          disabled={readOnly}
          placeholder="Describe movement, camera, mood…"
          style={ta}
        />
      </Section>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {onPlay && idx >= 0 && (
          <button
            type="button"
            className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)] shadow-[0_0_0_1px_var(--accent),0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] hover:shadow-[0_0_0_1px_var(--accent-hover),0_12px_32px_-8px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => onPlay(idx)}
            disabled={readOnly}
          >
            <Play size={14} /> Play
          </button>
        )}
        <button
          type="button"
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={readOnly}
          onClick={handleRegenImage}
          title={scene.imageUrl ? 'Regenerate image' : 'Generate image'}
        >
          <RefreshCw size={14} /> {scene.imageUrl ? 'Regen image' : 'Generate image'}
        </button>
        <button
          type="button"
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={handleAnimate}
          disabled={readOnly}
          title="Animate this scene"
        >
          <Sparkles size={14} /> {scene.pendingJobId ? 'Animating…' : scene.videoUrl ? 'Re-animate' : 'Animate'}
        </button>
      </div>

      {scene.lastError && (
        <div className="mt-3.5 flex items-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_18%,var(--surface))] px-3.5 py-2.5 text-[0.85rem] text-[var(--text)]">
          <AlertCircle size={14} /> {scene.lastError}
        </div>
      )}
    </Drawer>
  )
}

const ta: React.CSSProperties = {
  width: '100%',
  minHeight: 88,
  padding: 10,
  borderRadius: 8,
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: '0.85rem',
  resize: 'vertical',
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[0.72rem] uppercase tracking-[0.06em] text-[var(--muted)]">
        {label}
      </div>
      {children}
    </div>
  )
}
