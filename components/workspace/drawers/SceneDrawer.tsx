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
  onCancelAnimate?: (sceneId: string) => void
  onPlay?: (index: number) => void
}

export function SceneDrawer({ open, onClose, onAnimate, onCancelAnimate, onPlay }: Props) {
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
      <div style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--surface2)', marginBottom: 14 }}>
        {scene.videoUrl ? (
          <video src={scene.videoUrl} controls style={{ width: '100%', display: 'block' }} />
        ) : scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.imageUrl} alt={scene.sentence} style={{ width: '100%', display: 'block' }} />
        ) : (
          <div style={{ aspectRatio: '16/9', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Generating…</div>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {onPlay && idx >= 0 && (
          <button className="icon-btn" onClick={() => onPlay(idx)} disabled={readOnly}>
            <Play size={14} /> Play
          </button>
        )}
        <button
          className="icon-btn"
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
        {scene.pendingJobId ? (
          <button className="icon-btn icon-btn--danger" onClick={() => onCancelAnimate?.(scene.id)}>
            Cancel
          </button>
        ) : (
          <button
            className="icon-btn icon-btn--primary"
            onClick={() => onAnimate?.(scene.id)}
            disabled={readOnly || !scene.imageUrl || !scene.motionPrompt}
            title={!scene.motionPrompt ? 'No motion prompt' : 'Animate this scene'}
          >
            <Sparkles size={14} /> {scene.videoUrl ? 'Re-animate' : 'Animate'}
          </button>
        )}
      </div>

      {scene.lastError && (
        <div className="error-banner" style={{ marginTop: 14 }}>
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
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
