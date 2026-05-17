'use client'

import { useEffect, useState } from 'react'
import { Play, RefreshCw, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '../drawers/Drawer'
import { useWorkspace } from '@/context/workspace-context'

interface Props {
  open: boolean
  onClose: () => void
  onAnimate?: (sceneId: string) => void
  onPlay?: (index: number) => void
}

export function SceneDrawer({ open, onClose, onAnimate, onPlay }: Props) {
  const { storyData, activeSceneId, patchScene, readOnly } = useWorkspace()
  const scene = storyData?.scenes.find((s) => s.id === activeSceneId) ?? null
  const idx = storyData?.scenes.findIndex((s) => s.id === activeSceneId) ?? -1

  const [voiceover, setVoiceover] = useState('')
  const [motion, setMotion] = useState('')

  useEffect(() => {
    if (scene) {
      setVoiceover(scene.voiceover)
      setMotion(scene.motionPrompt ?? '')
    }
  }, [scene?.id, scene])

  if (!scene) return null

  const commit = () => {
    const patch: Record<string, unknown> = {}
    if (voiceover !== scene.voiceover) patch.voiceover = voiceover
    if (motion !== (scene.motionPrompt ?? '')) patch.motionPrompt = motion
    if (Object.keys(patch).length) patchScene(scene.id, patch)
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
            className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => onPlay(idx)}
            disabled={readOnly}
          >
            <Play size={14} /> Play
          </button>
        )}
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={readOnly}
          onClick={async () => {
            if (!scene.imageUrl) return
            try {
              const res = await fetch('/api/scene/regen-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sceneId: scene.id }),
              })
              if (res.status === 501) {
                toast.message('Regen image — coming soon')
                return
              }
              if (!res.ok) throw new Error(await res.text())
              const d = (await res.json()) as { url: string }
              patchScene(scene.id, { imageUrl: d.url })
              toast.success('Image regenerated')
            } catch (err) {
              toast.error('Regen failed', { description: err instanceof Error ? err.message : 'Try again' })
            }
          }}
          title="Regenerate image"
        >
          <RefreshCw size={14} /> Regen image
        </button>
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onAnimate?.(scene.id)}
          disabled={readOnly || !scene.imageUrl || !scene.motionPrompt || !!scene.pendingJobId}
          title={!scene.motionPrompt ? 'No motion prompt' : 'Animate this scene'}
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
